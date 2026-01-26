const { formatNumber, applyInflation, getThreadId } = require('../utils');

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

    // Применить inflation к ценам miscellaneous
    const inflation = game.inflation || 1;
    miscCard = applyInflation(miscCard, inflation);

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
  const threadId = getThreadId(query.message);
  const userId = query.from.id;

  try {
    // Найти активную игру в чате
    const game = await gameService.getActiveGameByChatId(chatId, threadId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.', threadId);
      return;
    }

    // Получить сохраненную карточку miscellaneous из состояния игры
    const miscCard = game.currentMiscellaneous;
    if (!miscCard) {
      await messageService.sendErrorMessage(chatId, 'Карточка miscellaneous не найдена. Попробуйте еще раз.', threadId);
      return;
    }

    // Проверить, что пользователь - текущий игрок
    const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!', threadId);
      return;
    }

    // Проверить условия для семейных карт
    if (miscCard.hasKids && (!currentPlayer.childrenCount || currentPlayer.childrenCount === 0)) {
      await messageService.sendErrorMessage(chatId, 'У вас нет детей для этой карточки!', threadId);
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
        await messageService.removeMessageKeyboard(chatId, query.message.message_id, threadId);
        // Отправить предложение оплаты кредиткой
        await messageService.sendCreditCardOfferMessage(chatId, miscCard, currentPlayer, 'miscellaneous', 1, threadId);
      } else {
        await messageService.sendErrorMessage(chatId, 'Ошибка при оплате miscellaneous.', threadId);
      }
      return;
    }

    // Удалить кнопки с сообщения карточки miscellaneous
    await messageService.removeMessageKeyboard(chatId, query.message.message_id, threadId);

    // Отправить сообщение об успешной оплате
    await messageService.sendErrorMessage(chatId, `✅ ${currentPlayer.username} оплатил "${miscCard.description}"!`, threadId);

    // Передать ход следующему игроку
    const nextTurnResult = await gameService.nextTurn(game.gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      if (nextTurnResult.transitioned) {
        await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer, threadId);
      }
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer, await gameService.getGame(game.gameId), threadId);
    }

  } catch (error) {
    console.error('Error in handlePayMiscellaneous:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при оплате miscellaneous.', threadId);
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
  const threadId = getThreadId(query.message);
  const userId = query.from.id;

  try {
    // Найти активную игру в чате
    const game = await gameService.getActiveGameByChatId(chatId, threadId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.', threadId);
      return;
    }

    // Получить сохраненную карточку miscellaneous из состояния игры
    const miscCard = game.currentMiscellaneous;
    if (!miscCard) {
      await messageService.sendErrorMessage(chatId, 'Карточка miscellaneous не найдена. Попробуйте еще раз.', threadId);
      return;
    }

    // Проверить, что пользователь - текущий игрок
    const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!', threadId);
      return;
    }

    // Проверить условия для семейных карт
    if (miscCard.hasKids && (!currentPlayer.childrenCount || currentPlayer.childrenCount === 0)) {
      await messageService.sendErrorMessage(chatId, 'У вас нет детей для этой карточки!', threadId);
      return;
    }

    // Оплатить кредиткой
    const payResult = await gameService.payMiscellaneousWithCreditCard(game.gameId, userId, miscCard);
    if (!payResult.success) {
      await messageService.sendErrorMessage(chatId, 'Ошибка при оплате miscellaneous кредиткой.', threadId);
      return;
    }

    // Удалить кнопки с сообщения предложения кредитки
    await messageService.removeMessageKeyboard(chatId, query.message.message_id, threadId);

    // Отправить сообщение об успешной оплате
    await messageService.sendErrorMessage(chatId, `✅ ${currentPlayer.username} оплатил "${miscCard.description}" кредиткой!`, threadId);

    // Передать ход следующему игроку
    const nextTurnResult = await gameService.nextTurn(game.gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      if (nextTurnResult.transitioned) {
        await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer, threadId);
      }
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer, await gameService.getGame(game.gameId), threadId);
    }

  } catch (error) {
    console.error('Error in handlePayMiscellaneousCreditCard:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при оплате miscellaneous кредиткой.', threadId);
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
  const threadId = getThreadId(query.message);
  const userId = query.from.id;

  try {
    // Найти активную игру в чате
    const game = await gameService.getActiveGameByChatId(chatId, threadId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.', threadId);
      return;
    }

    // Проверить, что пользователь - текущий игрок
    const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!', threadId);
      return;
    }

    // Удалить кнопки с сообщения карточки miscellaneous
    await messageService.removeMessageKeyboard(chatId, query.message.message_id, threadId);

    // Отправить сообщение о пропуске
    await messageService.sendErrorMessage(chatId, `⏭️ ${currentPlayer.username} пропустил "${game.currentMiscellaneous.description}"`, threadId);

    // Передать ход следующему игроку
    const nextTurnResult = await gameService.nextTurn(game.gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      if (nextTurnResult.transitioned) {
        await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer, threadId);
      }
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer, await gameService.getGame(game.gameId), threadId);
    }

  } catch (error) {
    console.error('Error in handleSkipMiscellaneous:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при пропуске miscellaneous.', threadId);
  }
}

module.exports = {
  handleMiscellaneous,
  handlePayMiscellaneous,
  handlePayMiscellaneousCreditCard,
  handleSkipMiscellaneous
};
