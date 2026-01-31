const { formatNumber, applyInflation, initializeDealCirculation, processDealAction, initializeCanSellStocksCirculation, processCanSellStocksAction, getThreadId } = require('../utils');
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

    // Удалить кнопки с сообщения выбора типа сделки
    await messageService.removeMessageKeyboard(chatId, query.message.message_id, threadId);

    // Сгенерировать сделку
    const { smallDeals } = require('../game/cards/smallDeals');
    const { bigDeals } = require('../game/cards/bigDeals');

    let deal;
    try {
      if (dealType === 'small') {
        const usedIds = game.usedSmallDealIds || [];
        const available = smallDeals.filter(deal => !usedIds.includes(deal.id));
        if (available.length === 0) {
          throw new Error('Last small deal issued');
        }
        const index = Math.floor(Math.random() * available.length);
        deal = available[index];
        usedIds.push(deal.id);
        await gameService.databaseService.setUsedSmallDealIds(game.gameId, usedIds);
      } else {
        const usedIds = game.usedBigDealIds || [];
        const available = bigDeals.filter(deal => !usedIds.includes(deal.id));
        if (available.length === 0) {
          throw new Error('Last big deal issued');
        }
        const index = Math.floor(Math.random() * available.length);
        deal = available[index];
        usedIds.push(deal.id);
        await gameService.databaseService.setUsedBigDealIds(game.gameId, usedIds);
      }
    } catch (error) {
      if (error.message === 'Last small deal issued') {
        const usedIds = [];
        await gameService.databaseService.setUsedSmallDealIds(game.gameId, usedIds);
        const available = smallDeals;
        const index = Math.floor(Math.random() * available.length);
        deal = available[index];
        usedIds.push(deal.id);
        await gameService.databaseService.setUsedSmallDealIds(game.gameId, usedIds);
      } else if (error.message === 'Last big deal issued') {
        const usedIds = [];
        await gameService.databaseService.setUsedBigDealIds(game.gameId, usedIds);
        const available = bigDeals;
        const index = Math.floor(Math.random() * available.length);
        deal = available[index];
        usedIds.push(deal.id);
        await gameService.databaseService.setUsedBigDealIds(game.gameId, usedIds);
      } else {
        throw error;
      }
    }

    // Применить inflation к ценам сделки
    const inflation = game.inflation || 1;
    deal = applyInflation(deal, inflation);

    // Сохранить сделку в состоянии игры
    await gameService.databaseService.setCurrentDeal(game.gameId, deal);

    // Инициализировать циркуляцию для anyCanBuySell или canSellStocks
    if (deal.anyCanBuySell) {
      await initializeDealCirculation(game.gameId, deal, services);
    } else if (deal.canSellStocks) {
      await initializeCanSellStocksCirculation(game.gameId, deal, services);
    }

    // Получить обновленный game объект (с currentDealQuantity = 1)
    const updatedGame = await gameService.getGame(game.gameId);

    // Отправить карточку сделки
    await messageService.sendDealCardMessage(chatId, deal, currentPlayer, updatedGame, updatedGame.currentDealQuantity, null, threadId);

  } catch (error) {
    console.error('Error in handleDealType:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при выборе типа сделки.', threadId);
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
  const threadId = getThreadId(query.message);
  const userId = query.from.id;

  try {
    // Найти активную игру в чате
    const game = await gameService.getActiveGameByChatId(chatId, threadId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.', threadId);
      return;
    }

    // Получить сохраненную сделку из состояния игры
    const deal = game.currentDeal;
    if (!deal) {
      await messageService.sendErrorMessage(chatId, 'Сделка не найдена. Попробуйте еще раз.', threadId);
      return;
    }

    // Предлагающий не может выполнять действия с предложенной сделкой
    if (game.offerState && game.offerState.step === 'confirmed' && game.offerState.offeringUserId === userId) {
      await messageService.sendErrorMessage(chatId, 'Вы уже предложили эту сделку другому игроку!', threadId);
      return;
    }

    // Проверить, является ли сделка предложенной
    const isOfferedDeal = game.offerState && game.offerState.targetUserId === userId;
    const originalDeal = isOfferedDeal ? {
      ...deal,
      cost: deal.originalCost || deal.cost,
      downPayment: deal.originalDownPayment || deal.downPayment
    } : deal;

    // Для предложенных сделок проверить, что пользователь - целевой
    if (isOfferedDeal && game.offerState.targetUserId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Эта сделка предложена другому игроку!', threadId);
      return;
    }

    // Проверить, что пользователь - текущий игрок (для обычных сделок)
    const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
    if (!isOfferedDeal && (!currentPlayer || currentPlayer.userId !== userId)) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!', threadId);
      return;
    }

    const isBigDeal = originalDeal.type === 'big';

    // Попробовать купить
    let buyResult;
    const hasMortgage = originalDeal.mortgage !== undefined;

    if (isBigDeal) {
      if (hasMortgage) {
        // Ипотечный сценарий для крупных сделок
        buyResult = await gameService.buyBigDeal(game.gameId, userId, originalDeal);
      } else {
        // Полная оплата для крупных сделок
        buyResult = await gameService.buyBigDeal(game.gameId, userId, originalDeal);
      }
    } else {
      if (hasMortgage) {
        // Ипотечный сценарий для мелких сделок
        buyResult = await gameService.buySmallDealWithMortgage(game.gameId, userId, originalDeal, game.currentDealQuantity);
      } else {
        // Полная оплата для мелких сделок
        buyResult = await gameService.buySmallDeal(game.gameId, userId, originalDeal, game.currentDealQuantity);
      }
    }

    if (!buyResult.success) {
      if (buyResult.error === 'insufficient_down_payment') {
        // Предложить оплатить первоначальный взнос кредиткой
        await messageService.removeMessageKeyboard(chatId, query.message.message_id, threadId);

        const dealWithDownPayment = {
          ...deal,
          cost: buyResult.downPayment, // Стоимость = первоначальный взнос
          title: `Первоначальный взнос за ${deal.title}`
        };

        await messageService.sendCreditCardOfferMessage(chatId, dealWithDownPayment, currentPlayer, 'mortgage_down_payment', 1, threadId);
      } else if (buyResult.error === 'insufficient_funds') {
        if (originalDeal.unlimitedStocks) {
          await messageService.sendErrorMessage(chatId, '❌ Недостаточно денег для покупки акций.', threadId);
        } else {
          // Обычная ошибка недостатка средств
          await messageService.sendCreditCardOfferMessage(chatId, deal, currentPlayer, 'deal', game.currentDealQuantity, threadId);
        }
      } else {
        await messageService.sendErrorMessage(chatId, 'Ошибка при покупке сделки.', threadId);
      }
      return;
    }

    // Если сделка была предложена, передать комиссию предлагающему и очистить состояние
    if (isOfferedDeal) {
      const { calculateCommission, transferCommission } = require('../utils/dealOffer');
      const commissionAmount = calculateCommission(originalDeal, game.offerState.commission);

      if (commissionAmount > 0) {
        await transferCommission(game.gameId, game.offerState.offeringUserId, commissionAmount, services);
      }

      await gameService.databaseService.setOfferState(game.gameId, null);
    }

    // Удалить кнопки с сообщения карточки сделки
    await messageService.removeMessageKeyboard(chatId, query.message.message_id, threadId);

    // Отправить сообщение об успешной покупке
    const buyerPlayer = isOfferedDeal ? game.players.find(p => p.userId === userId) : currentPlayer;
    const commissionText = isOfferedDeal ? ` с комиссией ${game.offerState.commission}%` : '';
    await messageService.sendErrorMessage(chatId, `✅ ${buyerPlayer.username} купил "${deal.title}"${commissionText}!`, threadId);

    // Проверяем переход на Fast Track после покупки
    if (buyResult.transitioned) {
      const updatedGame = await gameService.getGame(game.gameId);
      const updatedPlayer = updatedGame.players.find(p => p.userId === userId);
      await messageService.sendFastTrackTransitionMessage(chatId, updatedPlayer, threadId);
    }

    // Обработать циркуляцию для anyCanBuySell или canSellStocks
    if (deal.anyCanBuySell) {
      await processDealAction(game.gameId, userId, chatId, 'buy', services);
    } else if (deal.canSellStocks) {
      await processCanSellStocksAction(game.gameId, userId, chatId, 'buy', services);
    } else {
      // Передать ход следующему игроку
      const nextTurnResult = await gameService.nextTurn(game.gameId);
      if (nextTurnResult.success && nextTurnResult.nextPlayer) {
        if (nextTurnResult.transitioned) {
          await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer, threadId);
        }
        await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer, await gameService.getGame(game.gameId), threadId);
      }
    }

  } catch (error) {
    console.error('Error in handleBuyDeal:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при покупке сделки.', threadId);
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
  const threadId = getThreadId(query.message);
  const userId = query.from.id;

  try {
    // Найти активную игру в чате
    const game = await gameService.getActiveGameByChatId(chatId, threadId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.', threadId);
      return;
    }

    // Получить текущую сделку
    const deal = game.currentDeal;
    if (!deal) {
      await messageService.sendErrorMessage(chatId, 'Сделка не найдена. Попробуйте еще раз.', threadId);
      return;
    }

    // Предлагающий не может выполнять действия с предложенной сделкой
    if (game.offerState && game.offerState.step === 'confirmed' && game.offerState.offeringUserId === userId) {
      await messageService.sendErrorMessage(chatId, 'Вы уже предложили эту сделку другому игроку!', threadId);
      return;
    }

    // Проверить, является ли сделка предложенной
    const isOfferedDeal = game.offerState && game.offerState.targetUserId === userId;

    // Для предложенных сделок проверить, что пользователь - целевой
    if (isOfferedDeal && game.offerState.targetUserId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Эта сделка предложена другому игроку!', threadId);
      return;
    }

    // Проверить, что пользователь - текущий игрок (для обычных сделок)
    const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
    if (!isOfferedDeal && (!currentPlayer || currentPlayer.userId !== userId)) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!', threadId);
      return;
    }

    // Если сделка имеет multiple, применить ко всем игрокам
    if (deal && deal.multiple) {
      const processResult = await gameService.processMultiple(game.gameId, deal);
      if (!processResult.success) {
        await messageService.sendErrorMessage(chatId, 'Ошибка при обработке multiple сделки.', threadId);
        return;
      }

      // Удалить кнопки с сообщения карточки сделки
      await messageService.removeMessageKeyboard(chatId, query.message.message_id, threadId);

      // Отправить сообщение о применении multiple
      const action = deal.multiple === 2 ? 'удвоено' : 'уменьшено вдвое';
      await messageService.sendErrorMessage(chatId, `📊 Количество акций "${deal.title}" ${action} у всех игроков!`, threadId);

      // Проверяем переход на Fast Track для игроков, которые перешли
      if (processResult.transitioned && processResult.transitionedPlayers) {
        const updatedGame = await gameService.getGame(game.gameId);
        for (const transitionedUserId of processResult.transitionedPlayers) {
          const transitionedPlayer = updatedGame.players.find(p => p.userId === transitionedUserId);
          if (transitionedPlayer) {
            await messageService.sendFastTrackTransitionMessage(chatId, transitionedPlayer, threadId);
          }
        }
      }
    } else {
      // Удалить кнопки с сообщения карточки сделки
      await messageService.removeMessageKeyboard(chatId, query.message.message_id, threadId);

      if (deal && deal.anyCanBuySell) {
        // Обработать циркуляцию для anyCanBuySell
        await processDealAction(game.gameId, userId, chatId, 'skip', services);
        return; // Не отправлять обычное сообщение хода
      } else if (deal && deal.canSellStocks) {
        // Обработать циркуляцию для canSellStocks
        await processCanSellStocksAction(game.gameId, userId, chatId, 'skip', services);
        return; // Не отправлять обычное сообщение хода
      }
    }

    // Если предложенная сделка, очистить состояние
    if (isOfferedDeal) {
      await gameService.databaseService.setOfferState(game.gameId, null);
    }

    // Передать ход следующему игроку
    const nextTurnResult = await gameService.nextTurn(game.gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      if (nextTurnResult.transitioned) {
        await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer, threadId);
      }
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer, await gameService.getGame(game.gameId), threadId);
    }

  } catch (error) {
    console.error('Error in handleSkipDeal:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при пропуске сделки.', threadId);
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
  const threadId = getThreadId(query.message);
  const userId = query.from.id;

  try {
    // Найти активную игру в чате
    const game = await gameService.getActiveGameByChatId(chatId, threadId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.', threadId);
      return;
    }

    // Получить сохраненную сделку из состояния игры
    const deal = game.currentDeal;
    if (!deal) {
      await messageService.sendErrorMessage(chatId, 'Сделка не найдена. Попробуйте еще раз.', threadId);
      return;
    }

    // Предлагающий не может выполнять действия с предложенной сделкой
    if (game.offerState && game.offerState.step === 'confirmed' && game.offerState.offeringUserId === userId) {
      await messageService.sendErrorMessage(chatId, 'Вы уже предложили эту сделку другому игроку!', threadId);
      return;
    }

    // Проверить, является ли сделка предложенной
    const isOfferedDeal = game.offerState && game.offerState.targetUserId === userId;

    // Для предложенных сделок проверить, что пользователь - целевой
    if (isOfferedDeal && game.offerState.targetUserId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Эта сделка предложена другому игроку!', threadId);
      return;
    }

    // Проверить, что пользователь - текущий игрок (для обычных сделок)
    const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
    if (!isOfferedDeal && (!currentPlayer || currentPlayer.userId !== userId)) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!', threadId);
      return;
    }

    // Для expenses-сделок использовать expenses как стоимость
    const tempDeal = deal.expenses && !deal.cost ? { ...deal, cost: deal.expenses } : deal;

    // Купить кредиткой
    const buyResult = await gameService.buyDealWithCreditCard(game.gameId, userId, tempDeal, game.currentDealQuantity);
    if (!buyResult.success) {
      await messageService.sendErrorMessage(chatId, 'Ошибка при покупке сделки кредиткой.', threadId);
      return;
    }

    // Удалить кнопки с сообщения предложения кредитки
    await messageService.removeMessageKeyboard(chatId, query.message.message_id, threadId);

    // Если сделка была предложена, передать комиссию предлагающему
    if (isOfferedDeal) {
      const originalCost = deal.originalCost || deal.cost;
      const baseCost = deal.expenses && !deal.cost ? deal.expenses : originalCost;
      const commissionAmount = Math.round(baseCost * (game.offerState.commission / 100));

      if (commissionAmount > 0) {
        const { transferCommission } = require('../utils/dealOffer');
        await transferCommission(game.gameId, game.offerState.offeringUserId, commissionAmount, services);
      }

      await gameService.databaseService.setOfferState(game.gameId, null);
    }

    // Отправить сообщение об успешной покупке
    const buyerPlayer = isOfferedDeal ? game.players.find(p => p.userId === userId) : currentPlayer;
    const commissionText = isOfferedDeal ? ` с комиссией ${game.offerState.commission}%` : '';
    await messageService.sendErrorMessage(chatId, `✅ ${buyerPlayer.username} купил "${deal.title}" кредиткой${commissionText}!`, threadId);

    // Проверяем переход на Fast Track после покупки
    if (buyResult.transitioned) {
      const updatedGame = await gameService.getGame(game.gameId);
      const updatedPlayer = updatedGame.players.find(p => p.userId === userId);
      await messageService.sendFastTrackTransitionMessage(chatId, updatedPlayer, threadId);
    }

    // Обработать циркуляцию для anyCanBuySell
    if (deal.anyCanBuySell) {
      await processDealAction(game.gameId, userId, chatId, 'buy', services);
    } else {
      // Передать ход следующему игроку
      const nextTurnResult = await gameService.nextTurn(game.gameId);
      if (nextTurnResult.success && nextTurnResult.nextPlayer) {
        if (nextTurnResult.transitioned) {
          await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer, threadId);
        }
        await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer, await gameService.getGame(game.gameId), threadId);
      }
    }

  } catch (error) {
    console.error('Error in handleBuyDealWithCreditCard:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при покупке сделки кредиткой.', threadId);
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

    // Получить текущую сделку
    const deal = game.currentDeal;
    if (!deal || !deal.unlimitedStocks) {
      await messageService.sendErrorMessage(chatId, 'Сделка не найдена или не поддерживает изменение количества.', threadId);
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
    }, threadId);

  } catch (error) {
    console.error('Error in handleChangeQuantity:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка изменения количества.', threadId);
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

    // Получить текущую сделку
    const deal = game.currentDeal;
    if (!deal || !deal.canSellStocks) {
      await messageService.sendErrorMessage(chatId, 'Сделка не найдена или не поддерживает продажу.', threadId);
      return;
    }

    // Продать акции
    const sellResult = await gameService.sellStocks(game.gameId, userId, deal);
    if (!sellResult.success) {
      await messageService.sendErrorMessage(chatId, 'Ошибка при продаже акций.', threadId);
      return;
    }

    // Удалить кнопки с сообщения карточки сделки
    await messageService.removeMessageKeyboard(chatId, query.message.message_id, threadId);

    // Отправить сообщение об успешной продаже
    await messageService.sendErrorMessage(chatId, `✅ ${currentPlayer.username} продал акции "${deal.title}"!`, threadId);

    // Проверяем переход на Fast Track после продажи
    if (sellResult.transitioned) {
      const updatedGame = await gameService.getGame(game.gameId);
      const updatedPlayer = updatedGame.players.find(p => p.userId === userId);
      await messageService.sendFastTrackTransitionMessage(chatId, updatedPlayer, threadId);
    }

    // Обработать циркуляцию для anyCanBuySell или canSellStocks
    if (deal.anyCanBuySell) {
      await processDealAction(game.gameId, userId, chatId, 'sell', services);
    } else if (deal.canSellStocks) {
      await processCanSellStocksAction(game.gameId, userId, chatId, 'sell', services);
    } else {
      // Передать ход следующему игроку
      const nextTurnResult = await gameService.nextTurn(game.gameId);
      if (nextTurnResult.success && nextTurnResult.nextPlayer) {
        if (nextTurnResult.transitioned) {
          await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer, threadId);
        }
        await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer, await gameService.getGame(game.gameId), threadId);
      }
    }

  } catch (error) {
    console.error('Error in handleSellStocks:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при продаже акций.', threadId);
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

    // Получить текущую сделку
    const deal = game.currentDeal;
    if (!deal || !deal.expenses) {
      await messageService.sendErrorMessage(chatId, 'Сделка не найдена или не требует оплаты расходов.', threadId);
      return;
    }

    // Проверить, есть ли у игрока недвижимость
    const hasRealEstate = currentPlayer.assets && currentPlayer.assets.some(asset => asset.isRealEstate);
    if (!hasRealEstate) {
      await messageService.sendErrorMessage(chatId, 'У вас нет недвижимости для оплаты расходов.', threadId);
      return;
    }

    // Оплатить расходы
    const payResult = await gameService.payExpenses(game.gameId, userId, deal);
    if (!payResult.success) {
      if (payResult.error === 'insufficient_funds') {
        // Удалить кнопки с сообщения карточки сделки
        await messageService.removeMessageKeyboard(chatId, query.message.message_id, threadId);
        // Отправить предложение оплаты кредиткой
        await messageService.sendCreditCardOfferMessage(chatId, deal, currentPlayer, 'deal', 1, threadId);
      } else {
        await messageService.sendErrorMessage(chatId, 'Ошибка при оплате расходов.', threadId);
      }
      return;
    }

    // Удалить кнопки с сообщения карточки сделки
    await messageService.removeMessageKeyboard(chatId, query.message.message_id, threadId);

    // Отправить сообщение об успешной оплате
    await messageService.sendErrorMessage(chatId, `✅ ${currentPlayer.username} оплатил расходы "${deal.title}"!`, threadId);

    // Передать ход следующему игроку
    const nextTurnResult = await gameService.nextTurn(game.gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      if (nextTurnResult.transitioned) {
        await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer, threadId);
      }
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer, await gameService.getGame(game.gameId), threadId);
    }

  } catch (error) {
    console.error('Error in handlePayExpenses:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при оплате расходов.', threadId);
  }
}

/**
 * Обрабатывает покупку первоначального взноса кредиткой для ипотечной сделки
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleBuyMortgageDownPaymentWithCreditCard(query, services) {
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

    // Получить сохраненную сделку из состояния игры
    const deal = game.currentDeal;
    if (!deal) {
      await messageService.sendErrorMessage(chatId, 'Сделка не найдена. Попробуйте еще раз.', threadId);
      return;
    }

    // Проверить, что пользователь - текущий игрок
    const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!', threadId);
      return;
    }

    // Проверить, что сделка с ипотекой
    if (!deal.mortgage) {
      await messageService.sendErrorMessage(chatId, 'Эта сделка не требует ипотеки.', threadId);
      return;
    }

    // Купить с ипотекой и кредитом на первоначальный взнос
    const isBigDeal = deal.type === 'big';
    const buyResult = isBigDeal
      ? await gameService.buyBigDealWithMortgageAndCreditDownPayment(game.gameId, userId, deal)
      : await gameService.buySmallDealWithMortgageAndCreditDownPayment(
        game.gameId,
        userId,
        deal,
        game.currentDealQuantity
      );

    if (!buyResult.success) {
      await messageService.sendErrorMessage(chatId, 'Ошибка при покупке сделки.', threadId);
      return;
    }

    // Удалить кнопки с сообщения предложения кредитки
    await messageService.removeMessageKeyboard(chatId, query.message.message_id, threadId);

    // Отправить сообщение об успешной покупке
    await messageService.sendErrorMessage(chatId, `✅ ${currentPlayer.username} купил "${deal.title}" в ипотеку с кредитом на первоначальный взнос!`, threadId);

    // Проверяем переход на Fast Track после покупки
    if (buyResult.transitioned) {
      const updatedGame = await gameService.getGame(game.gameId);
      const updatedPlayer = updatedGame.players.find(p => p.userId === userId);
      await messageService.sendFastTrackTransitionMessage(chatId, updatedPlayer, threadId);
    }

    // Обработать циркуляцию для anyCanBuySell
    if (deal.anyCanBuySell) {
      await processDealAction(game.gameId, userId, chatId, 'buy', services);
    } else {
      // Передать ход следующему игроку
      const nextTurnResult = await gameService.nextTurn(game.gameId);
      if (nextTurnResult.success && nextTurnResult.nextPlayer) {
        if (nextTurnResult.transitioned) {
          await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer, threadId);
        }
        await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer, await gameService.getGame(game.gameId), threadId);
      }
    }

  } catch (error) {
    console.error('Error in handleBuyMortgageDownPaymentWithCreditCard:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при покупке сделки.', threadId);
  }
}

module.exports = {
  handleDealType,
  handleBuyDeal,
  handleSkipDeal,
  handleBuyDealWithCreditCard,
  handleBuyMortgageDownPaymentWithCreditCard,
  handleChangeQuantity,
  handleSellStocks,
  handlePayExpenses
};
