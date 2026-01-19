const { formatNumber, initializeDealCirculation, processDealAction } = require('../utils');
const { FIELD_TYPES } = require('../game/board');

/**
 * Обрабатывает выбор типа сделки
 * @param {Object} query - Callback query от Telegram
 * @param {string} dealType - Тип сделки ('small' или 'big')
 * @param {Object} services - Объект с сервисами
 */
async function handleDealType(query, dealType, services) {
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

    // Удалить кнопки с сообщения выбора типа сделки
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Убрать текст "Выберите тип сделки:" из сообщения
    const newText = query.message.text.replace('\nВыберите тип сделки:', '');
    if (newText !== query.message.text) {
      await messageService.editMessageText(chatId, query.message.message_id, newText);
    }

    // Сгенерировать сделку
    const { getRandomSmallDeal } = require('../game/cards/smallDeals');
    const { getRandomBigDeal } = require('../game/cards/bigDeals');
    const deal = dealType === 'small' ? getRandomSmallDeal() : getRandomBigDeal();

    // Сохранить сделку в состоянии игры
    await gameService.databaseService.setCurrentDeal(game.gameId, deal);

    // Инициализировать циркуляцию для anyCanBuySell
    if (deal.anyCanBuySell) {
      await initializeDealCirculation(game.gameId, deal, services);
    }

    // Получить обновленный game объект (с currentDealQuantity = 1)
    const updatedGame = await gameService.getGame(game.gameId);

    // Отправить карточку сделки
    await messageService.sendDealCardMessage(chatId, deal, currentPlayer, updatedGame, updatedGame.currentDealQuantity);

  } catch (error) {
    console.error('Error in handleDealType:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при выборе типа сделки.');
  }
}

/**
 * Обрабатывает покупку сделки
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleBuyDeal(query, services) {
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

    // Получить сохраненную сделку из состояния игры
    const deal = game.currentDeal;
    if (!deal) {
      await messageService.sendErrorMessage(chatId, 'Сделка не найдена. Попробуйте еще раз.');
      return;
    }

    const isBigDeal = deal.type === 'big';

    // Попробовать купить
    let buyResult;
    if (isBigDeal) {
      buyResult = await gameService.buyBigDeal(game.gameId, userId, deal);
    } else {
      buyResult = await gameService.buySmallDeal(game.gameId, userId, deal, game.currentDealQuantity);
    }

    if (!buyResult.success) {
      if (buyResult.error === 'insufficient_funds') {
        // Удалить кнопки с сообщения карточки сделки
        await messageService.removeMessageKeyboard(chatId, query.message.message_id);
        // Отправить предложение оплаты кредиткой
        await messageService.sendCreditCardOfferMessage(chatId, deal, currentPlayer);
      } else {
        await messageService.sendErrorMessage(chatId, 'Ошибка при покупке сделки.');
      }
      return;
    }

    // Удалить кнопки с сообщения карточки сделки
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Отправить сообщение об успешной покупке
    await messageService.sendErrorMessage(chatId, `✅ ${currentPlayer.username} купил "${deal.title}"!`);

    // Обработать циркуляцию для anyCanBuySell
    if (deal.anyCanBuySell) {
      await processDealAction(game.gameId, userId, chatId, 'buy', services);
    } else {
      // Передать ход следующему игроку
      const nextTurnResult = await gameService.nextTurn(game.gameId);
      if (nextTurnResult.success && nextTurnResult.nextPlayer) {
        await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
      }
    }

  } catch (error) {
    console.error('Error in handleBuyDeal:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при покупке сделки.');
  }
}

/**
 * Обрабатывает пропуск сделки
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleSkipDeal(query, services) {
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

    // Получить текущую сделку
    const deal = game.currentDeal;

    // Если сделка имеет multiple, применить ко всем игрокам
    if (deal && deal.multiple) {
      const processResult = await gameService.processMultiple(game.gameId, deal);
      if (!processResult.success) {
        await messageService.sendErrorMessage(chatId, 'Ошибка при обработке multiple сделки.');
        return;
      }

      // Удалить кнопки с сообщения карточки сделки
      await messageService.removeMessageKeyboard(chatId, query.message.message_id);

      // Отправить сообщение о применении multiple
      const action = deal.multiple === 2 ? 'удвоено' : 'уменьшено вдвое';
      await messageService.sendErrorMessage(chatId, `📊 Количество акций "${deal.title}" ${action} у всех игроков!`);
    } else {
      // Удалить кнопки с сообщения карточки сделки
      await messageService.removeMessageKeyboard(chatId, query.message.message_id);

      if (deal && deal.anyCanBuySell) {
        // Обработать циркуляцию для anyCanBuySell
        await processDealAction(game.gameId, userId, chatId, 'skip', services);
        return; // Не отправлять обычное сообщение хода
      }
    }

    // Передать ход следующему игроку
    const nextTurnResult = await gameService.nextTurn(game.gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
    }

  } catch (error) {
    console.error('Error in handleSkipDeal:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при пропуске сделки.');
  }
}

/**
 * Обрабатывает покупку сделки кредиткой
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleBuyDealWithCreditCard(query, services) {
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

    // Получить сохраненную сделку из состояния игры
    const deal = game.currentDeal;
    if (!deal) {
      await messageService.sendErrorMessage(chatId, 'Сделка не найдена. Попробуйте еще раз.');
      return;
    }

    // Купить кредиткой
    const buyResult = await gameService.buyDealWithCreditCard(game.gameId, userId, deal);
    if (!buyResult.success) {
      await messageService.sendErrorMessage(chatId, 'Ошибка при покупке сделки кредиткой.');
      return;
    }

    // Удалить кнопки с сообщения предложения кредитки
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Отправить сообщение об успешной покупке
    await messageService.sendErrorMessage(chatId, `✅ ${currentPlayer.username} купил "${deal.title}" кредиткой!`);

    // Обработать циркуляцию для anyCanBuySell
    if (deal.anyCanBuySell) {
      await processDealAction(game.gameId, userId, chatId, 'buy', services);
    } else {
      // Передать ход следующему игроку
      const nextTurnResult = await gameService.nextTurn(game.gameId);
      if (nextTurnResult.success && nextTurnResult.nextPlayer) {
        await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
      }
    }

  } catch (error) {
    console.error('Error in handleBuyDealWithCreditCard:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при покупке сделки кредиткой.');
  }
}

/**
 * Обрабатывает изменение количества для unlimitedStocks
 * @param {Object} query - Callback query от Telegram
 * @param {number} delta - Изменение количества (+1, -1, +10, -10)
 * @param {Object} services - Объект с сервисами
 */
async function handleChangeQuantity(query, delta, services) {
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

    // Получить текущую сделку
    const deal = game.currentDeal;
    if (!deal || !deal.unlimitedStocks) {
      await messageService.sendErrorMessage(chatId, 'Сделка не найдена или не поддерживает изменение количества.');
      return;
    }

    // Вычислить новое количество
    let newQuantity = game.currentDealQuantity + delta;

    // Для крупных изменений (+-10, +-100) округлять до ближайшего числа, кратного 10
    if (Math.abs(delta) >= 10) {
      newQuantity = Math.round(newQuantity / 10) * 10;
    }

    // Минимум 1
    newQuantity = Math.max(1, newQuantity);

    // Если количество не изменилось, не обновлять
    if (newQuantity === game.currentDealQuantity) {
      return;
    }

    // Сохранить новое количество
    await gameService.databaseService.setCurrentDealQuantity(game.gameId, newQuantity);

    // Обновить сообщение с новой карточкой
    const updatedGame = await gameService.getGame(game.gameId);
    const content = messageService.generateDealCardContent(deal, currentPlayer, updatedGame, newQuantity, null);

    await messageService.editMessageText(chatId, query.message.message_id, content.text, {
      parse_mode: 'Markdown',
      reply_markup: content.keyboard
    });

  } catch (error) {
    console.error('Error in handleChangeQuantity:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка изменения количества.');
  }
}

/**
 * Обрабатывает продажу акций
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleSellStocks(query, services) {
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

    // Получить текущую сделку
    const deal = game.currentDeal;
    if (!deal || !deal.canSellStocks) {
      await messageService.sendErrorMessage(chatId, 'Сделка не найдена или не поддерживает продажу.');
      return;
    }

    // Продать акции
    const sellResult = await gameService.sellStocks(game.gameId, userId, deal);
    if (!sellResult.success) {
      await messageService.sendErrorMessage(chatId, 'Ошибка при продаже акций.');
      return;
    }

    // Удалить кнопки с сообщения карточки сделки
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Отправить сообщение об успешной продаже
    await messageService.sendErrorMessage(chatId, `✅ ${currentPlayer.username} продал акции "${deal.title}"!`);

    // Обработать циркуляцию для anyCanBuySell
    if (deal.anyCanBuySell) {
      await processDealAction(game.gameId, userId, chatId, 'sell', services);
    } else {
      // Передать ход следующему игроку
      const nextTurnResult = await gameService.nextTurn(game.gameId);
      if (nextTurnResult.success && nextTurnResult.nextPlayer) {
        await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
      }
    }

  } catch (error) {
    console.error('Error in handleSellStocks:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при продаже акций.');
  }
}

/**
 * Обрабатывает оплату расходов
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handlePayExpenses(query, services) {
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

    // Получить текущую сделку
    const deal = game.currentDeal;
    if (!deal || !deal.expenses) {
      await messageService.sendErrorMessage(chatId, 'Сделка не найдена или не требует оплаты расходов.');
      return;
    }

    // Проверить, есть ли у игрока недвижимость
    const hasRealEstate = currentPlayer.assets && currentPlayer.assets.some(asset => asset.isRealEstate);
    if (!hasRealEstate) {
      await messageService.sendErrorMessage(chatId, 'У вас нет недвижимости для оплаты расходов.');
      return;
    }

    // Оплатить расходы
    const payResult = await gameService.payExpenses(game.gameId, userId, deal);
    if (!payResult.success) {
      if (payResult.error === 'insufficient_funds') {
        // Удалить кнопки с сообщения карточки сделки
        await messageService.removeMessageKeyboard(chatId, query.message.message_id);
        // Отправить предложение оплаты кредиткой
        await messageService.sendCreditCardOfferMessage(chatId, deal, currentPlayer);
      } else {
        await messageService.sendErrorMessage(chatId, 'Ошибка при оплате расходов.');
      }
      return;
    }

    // Удалить кнопки с сообщения карточки сделки
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Отправить сообщение об успешной оплате
    await messageService.sendErrorMessage(chatId, `✅ ${currentPlayer.username} оплатил расходы "${deal.title}"!`);

    // Передать ход следующему игроку
    const nextTurnResult = await gameService.nextTurn(game.gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
    }

  } catch (error) {
    console.error('Error in handlePayExpenses:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при оплате расходов.');
  }
}

module.exports = {
  handleDealType,
  handleBuyDeal,
  handleSkipDeal,
  handleBuyDealWithCreditCard,
  handleChangeQuantity,
  handleSellStocks,
  handlePayExpenses
};
