const { formatNumber } = require('../utils');

/**
 * Обрабатывает попадание игрока на поле miscellaneous
 * @param {string} gameId - ID игры
 * @param {string} userId - ID игрока
 * @param {Object} services - Объект с сервисами
 * @returns {Object} Выбранная miscellaneous карточка
 */
async function handleMiscellaneous(gameId, userId, services) {
  const { gameService } = services;

  try {
    // Найти игру
    const game = await gameService.getGame(gameId);
    if (!game) {
      throw new Error('Игра не найдена');
    }

    // Получить текущего игрока
    const currentPlayer = await gameService.getCurrentPlayer(gameId);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      throw new Error('Не ваш ход');
    }

    // Сгенерировать miscellaneous
    const { miscellaneous } = require('../game/cards/miscellaneous');

    let miscCard;
    try {
      const usedIds = game.usedMiscellaneousIds || [];
      const availableIndices = [];
      for (let i = 0; i < miscellaneous.length; i++) {
        if (!usedIds.includes(i)) {
          availableIndices.push(i);
        }
      }
      if (availableIndices.length === 0) {
        // Если все карты использованы, сбросить и начать заново
        await gameService.databaseService.setUsedMiscellaneousIds(gameId, []);
        const randomIndex = Math.floor(Math.random() * miscellaneous.length);
        miscCard = miscellaneous[randomIndex];
        await gameService.databaseService.setUsedMiscellaneousIds(gameId, [randomIndex]);
      } else {
        const randomIndex = Math.floor(Math.random() * availableIndices.length);
        const cardIndex = availableIndices[randomIndex];
        miscCard = miscellaneous[cardIndex];
        usedIds.push(cardIndex);
        await gameService.databaseService.setUsedMiscellaneousIds(gameId, usedIds);
      }
    } catch (error) {
      console.error('Error generating miscellaneous card:', error);
      throw error;
    }

    // Сохранить карточку в состоянии игры
    await gameService.databaseService.setCurrentMiscellaneous(gameId, miscCard);

    // Вернуть карточку для использования в комбинированном сообщении
    return miscCard;

  } catch (error) {
    console.error('Error in handleMiscellaneous:', error);
    throw error;
  }
}

/**
 * Обрабатывает оплату miscellaneous
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handlePayMiscellaneous(query, services) {
  const { gameService, messageService } = services;
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  try {
    // Найти активную игру в чате
    const game = await gameService.getActiveGameByChatId(chatId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.');
      return;
    }

    // Получить сохраненную карточку miscellaneous из состояния игры
    const miscCard = game.currentMiscellaneous;
    if (!miscCard) {
      await messageService.sendErrorMessage(chatId, 'Карточка miscellaneous не найдена. Попробуйте еще раз.');
      return;
    }

    // Проверить, что пользователь - текущий игрок
    const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!');
      return;
    }

    // Проверить условия для семейных карт
    if (miscCard.hasKids && (!currentPlayer.childrenCount || currentPlayer.childrenCount === 0)) {
      await messageService.sendErrorMessage(chatId, 'У вас нет детей для этой карточки!');
      return;
    }

    let payResult;
    if (miscCard.mortgage !== undefined) {
      // Карточка с ипотекой
      payResult = await gameService.buyMiscellaneousWithMortgage(game.gameId, userId, miscCard);
    } else if (miscCard.credit) {
      // Карточка с кредитом
      payResult = await gameService.buyMiscellaneousWithCredit(game.gameId, userId, miscCard);
    } else {
      // Обычные расходы
      payResult = await gameService.payMiscellaneousExpenses(game.gameId, userId, miscCard);
    }

    if (!payResult.success) {
      if (payResult.error === 'insufficient_funds') {
        // Удалить кнопки с сообщения карточки miscellaneous
        await messageService.removeMessageKeyboard(chatId, query.message.message_id);
        // Отправить предложение оплаты кредиткой
        await messageService.sendCreditCardOfferMessage(chatId, miscCard, currentPlayer, 'miscellaneous');
      } else {
        await messageService.sendErrorMessage(chatId, 'Ошибка при оплате miscellaneous.');
      }
      return;
    }

    // Удалить кнопки с сообщения карточки miscellaneous
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Отправить сообщение об успешной оплате
    await messageService.sendErrorMessage(chatId, `✅ ${currentPlayer.username} оплатил "${miscCard.description}"!`);

    // Передать ход следующему игроку
    const nextTurnResult = await gameService.nextTurn(game.gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
    }

  } catch (error) {
    console.error('Error in handlePayMiscellaneous:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при оплате miscellaneous.');
  }
}

/**
 * Обрабатывает оплату miscellaneous кредиткой
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handlePayMiscellaneousCreditCard(query, services) {
  const { gameService, messageService } = services;
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  try {
    // Найти активную игру в чате
    const game = await gameService.getActiveGameByChatId(chatId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.');
      return;
    }

    // Получить сохраненную карточку miscellaneous из состояния игры
    const miscCard = game.currentMiscellaneous;
    if (!miscCard) {
      await messageService.sendErrorMessage(chatId, 'Карточка miscellaneous не найдена. Попробуйте еще раз.');
      return;
    }

    // Проверить, что пользователь - текущий игрок
    const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!');
      return;
    }

    // Проверить условия для семейных карт
    if (miscCard.hasKids && (!currentPlayer.childrenCount || currentPlayer.childrenCount === 0)) {
      await messageService.sendErrorMessage(chatId, 'У вас нет детей для этой карточки!');
      return;
    }

    // Оплатить кредиткой
    const payResult = await gameService.payMiscellaneousWithCreditCard(game.gameId, userId, miscCard);
    if (!payResult.success) {
      await messageService.sendErrorMessage(chatId, 'Ошибка при оплате miscellaneous кредиткой.');
      return;
    }

    // Удалить кнопки с сообщения предложения кредитки
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Отправить сообщение об успешной оплате
    await messageService.sendErrorMessage(chatId, `✅ ${currentPlayer.username} оплатил "${miscCard.description}" кредиткой!`);

    // Передать ход следующему игроку
    const nextTurnResult = await gameService.nextTurn(game.gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
    }

  } catch (error) {
    console.error('Error in handlePayMiscellaneousCreditCard:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при оплате miscellaneous кредиткой.');
  }
}

/**
 * Обрабатывает пропуск miscellaneous
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleSkipMiscellaneous(query, services) {
  const { gameService, messageService } = services;
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  try {
    // Найти активную игру в чате
    const game = await gameService.getActiveGameByChatId(chatId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.');
      return;
    }

    // Проверить, что пользователь - текущий игрок
    const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!');
      return;
    }

    // Удалить кнопки с сообщения карточки miscellaneous
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Отправить сообщение о пропуске
    await messageService.sendErrorMessage(chatId, `⏭️ ${currentPlayer.username} пропустил "${game.currentMiscellaneous.description}"`);

    // Передать ход следующему игроку
    const nextTurnResult = await gameService.nextTurn(game.gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
    }

  } catch (error) {
    console.error('Error in handleSkipMiscellaneous:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при пропуске miscellaneous.');
  }
}

module.exports = {
  handleMiscellaneous,
  handlePayMiscellaneous,
  handlePayMiscellaneousCreditCard,
  handleSkipMiscellaneous
};
