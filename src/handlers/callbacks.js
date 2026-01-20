const { formatNumber } = require('../utils');
const { FIELD_TYPES } = require('../game/board');

// Импорт функций из других модулей
const { handleDealType, handleBuyDeal, handleSkipDeal, handleBuyDealWithCreditCard, handleChangeQuantity, handleSellStocks, handlePayExpenses } = require('./deals');
const { handleMiscellaneous, handlePayMiscellaneous, handlePayMiscellaneousCreditCard, handleSkipMiscellaneous } = require('./miscellaneous');
const { handleCharity, handleDonateCharity, handleSkipCharity } = require('./charity');
const { handleProfile, handleStats, handleAssets, handleCredits } = require('./profile');

/**
 * Обрабатывает бросок кубика
 * @param {Object} query - Callback query от Telegram
 * @param {number} diceCount - Количество кубиков (1 или 2)
 * @param {Object} services - Объект с сервисами { gameService, messageService, bot }
 */
async function handleRollDice(query, diceCount, services) {
  const { gameService, messageService, bot } = services;
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
    const { validateCurrentPlayer } = require('../utils/validators');
    const currentPlayer = await validateCurrentPlayer(game.gameId, userId, services, chatId);
    if (!currentPlayer) {
      return;
    }

    // Удалить кнопки с сообщения о броске кубика
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Убрать текст "Выберите действие:" из сообщения
    const newText = query.message.text.replace('\nВыберите действие:', '');
    if (newText !== query.message.text) {
      await messageService.editMessageText(chatId, query.message.message_id, newText);
    }

    // Проверить, что кубик еще не брошен в этом ходу
    if (game.diceRolledThisTurn) {
      await messageService.sendErrorMessage(chatId, 'Вы уже бросили кубик в этом ходу!');
      return;
    }

    // Бросить кубик(и)
    const steps = gameService.rollDice(diceCount);

    // Установить флаг, что кубик брошен
    await gameService.setDiceRolledThisTurn(game.gameId, true);

    // Переместить игрока
    const moveResult = await gameService.movePlayer(game.gameId, userId, steps);
    if (!moveResult.success) {
      await messageService.sendErrorMessage(chatId, 'Ошибка перемещения: ' + moveResult.error);
      return;
    }

    // Проверить тип поля
    if (moveResult.fieldType === FIELD_TYPES.DEAL) {
      // Игрок попал на поле "Сделки" - показать комбинированное сообщение
      await messageService.sendCombinedRollMoveDealMessage(
        chatId,
        currentPlayer,
        steps,
        moveResult.newPosition,
        moveResult.inFastTrack,
        moveResult.paydayEvents || []
      );

      // Уменьшить счетчик ходов благотворительности
      if (currentPlayer.charityEffect && currentPlayer.charityTurnsLeft > 0) {
        await gameService.decreaseCharityTurns(game.gameId, userId);
      }

      // Для поля DEAL не передаем ход следующему игроку - ждем выбора типа сделки
    } else if (moveResult.fieldType === FIELD_TYPES.MISCELLANEOUS) {
      // Игрок попал на поле "Miscellaneous" - обработать miscellaneous и показать комбинированное сообщение
      const miscCard = await handleMiscellaneous(game.gameId, userId, services);

      // Уменьшить счетчик ходов благотворительности
      if (currentPlayer.charityEffect && currentPlayer.charityTurnsLeft > 0) {
        await gameService.decreaseCharityTurns(game.gameId, userId);
      }

      // Показать комбинированное сообщение с miscellaneous
      await messageService.sendCombinedRollMoveMiscellaneousMessage(
        chatId,
        currentPlayer,
        steps,
        moveResult.newPosition,
        moveResult.inFastTrack,
        moveResult.paydayEvents || [],
        miscCard,
        game
      );

      // Для поля MISCELLANEOUS не передаем ход следующему игроку - ждем оплаты
    } else if (moveResult.fieldType === FIELD_TYPES.CHARITY) {
      // Игрок попал на поле "Благотворительность" - показать комбинированное сообщение
      await handleCharity(game.gameId, userId, services);

      // Уменьшить счетчик ходов благотворительности
      if (currentPlayer.charityEffect && currentPlayer.charityTurnsLeft > 0) {
        await gameService.decreaseCharityTurns(game.gameId, userId);
      }

      // Для поля CHARITY не передаем ход следующему игроку - ждем выбора
    } else {
      // Обычное поле - отправить стандартное сообщение и передать ход
      await messageService.sendCombinedRollMovePaydayMessage(
        chatId,
        currentPlayer,
        steps,
        moveResult.newPosition,
        moveResult.fieldType,
        moveResult.inFastTrack,
        moveResult.paydayEvents || []
      );

      // Уменьшить счетчик ходов благотворительности
      if (currentPlayer.charityEffect && currentPlayer.charityTurnsLeft > 0) {
        await gameService.decreaseCharityTurns(game.gameId, userId);
      }

      // TODO: Обработать другие события на поле (финансовые изменения, эффекты)

      // Передать ход следующему игроку
      const nextTurnResult = await gameService.nextTurn(game.gameId);
      if (nextTurnResult.success && nextTurnResult.nextPlayer) {
        // Отправить сообщение следующему игроку
        const nextPlayerChatId = nextTurnResult.nextPlayer.userId; // Предполагаем, что chatId совпадает с userId для личных сообщений
        // В групповом чате отправляем всем, но на практике нужно отправлять личные сообщения
        await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
      }
    }

  } catch (error) {
    console.error('Error in handleRollDice:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при броске кубика.');
  }
}

/**
 * Обрабатывает callback_query от inline кнопок
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами { gameService, messageService, bot }
 */
async function handleCallbackQuery(query, services) {
  const { gameService, messageService, bot } = services;
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const username = query.from.first_name || query.from.username || 'игрок';
  const data = query.data;

  // Подтверждаем получение callback
  await bot.answerCallbackQuery(query.id);

  try {
    switch (data) {
      case 'play':

        // Проверить наличие активной игры для чата
        const existingGame = await gameService.getActiveGameByChatId(chatId);
        if (existingGame) {
          // Присоединиться к существующей игре
          const joinResult = await gameService.joinGame(userId, existingGame.gameId, username);
          if (joinResult.success) {
            // Удалить кнопки с сообщения
            await messageService.removeMessageKeyboard(chatId, query.message.message_id);
            // Отправить карточку игрока
            await messageService.sendPlayerCard(chatId, joinResult.player);

            // Удалить старое сообщение комнаты ожидания и отправить новое
            const updatedGame = await gameService.getGame(existingGame.gameId);
            if (existingGame.waitingMessageId) {
              await messageService.deleteMessage(chatId, existingGame.waitingMessageId);
            }
            const newMessageId = await messageService.sendWaitingRoomMessage(chatId, updatedGame);
            await gameService.setWaitingMessageId(existingGame.gameId, newMessageId);
          } else {
            await messageService.sendJoinErrorMessage(chatId, joinResult.error);
          }
        } else {
          // Удалить кнопки с сообщения
          await messageService.removeMessageKeyboard(chatId, query.message.message_id);

          // Создать новую игру для чата
          const gameId = await gameService.createGame(chatId, userId, username);

          // Отправить карточку игрока создателю
          const game = await gameService.getGame(gameId);
          const player = game.players.find(p => p.userId === userId);
          if (player) {
            await messageService.sendPlayerCard(chatId, player);
          }

          // Отправить сообщение комнаты ожидания
          const messageId = await messageService.sendWaitingRoomMessage(chatId, game);
          await gameService.setWaitingMessageId(gameId, messageId);
        }
        break;

      case 'start_game':
        // Найти активную игру в чате
        const gameToStart = await gameService.getActiveGameByChatId(chatId);
        if (gameToStart && gameToStart.creatorId === userId) {
          const startResult = await gameService.startGame(userId, gameToStart.gameId);
          if (startResult.success) {
            // Удалить кнопки с сообщения
            await messageService.removeMessageKeyboard(chatId, query.message.message_id);

            // Удалить сообщение комнаты ожидания
            if (gameToStart.waitingMessageId) {
              await messageService.deleteMessage(chatId, gameToStart.waitingMessageId);
            }

            // Начать игру - отправить ход первому игроку
            const firstPlayer = await gameService.getCurrentPlayer(gameToStart.gameId);
            if (firstPlayer) {
              await messageService.sendPlayerTurnMessage(chatId, firstPlayer);
            }
          } else {
            await messageService.sendPlayErrorMessage(chatId, startResult.error);
          }
        } else {
          await messageService.sendPlayErrorMessage(chatId, 'not_creator');
        }
        break;

      case 'rules':
        // Показать правила
        await messageService.sendRulesMessage(chatId);
        break;

      case 'help':
        // Показать помощь
        await messageService.sendHelpMessage(chatId);
        break;

      case 'roll_dice':
        // Бросок 1 кубика (обычный режим)
        await handleRollDice(query, 1, services);
        break;

      case 'roll_dice_1':
        // Бросок 1 кубика (режим благотворительности)
        await handleRollDice(query, 1, services);
        break;

      case 'roll_dice_2':
        // Бросок 2 кубиков (режим благотворительности)
        await handleRollDice(query, 2, services);
        break;

      case 'end_game_vote':
        // Обработать голос за окончание игры
        const commands = require('./commands');
        await commands.handleEndGameVote(query, services);
        break;

      case 'small_deal':
        // Выбор мелкой сделки
        await handleDealType(query, 'small', services);
        break;

      case 'big_deal':
        // Выбор крупной сделки
        await handleDealType(query, 'big', services);
        break;

      case 'buy_deal':
        // Покупка сделки
        await handleBuyDeal(query, services);
        break;

      case 'offer_deal':
        // Начать предложение сделки
        await handleOfferDeal(query, services);
        break;

      case 'select_commission_1':
        await handleSelectCommission(query, 1, services);
        break;

      case 'select_commission_3':
        await handleSelectCommission(query, 3, services);
        break;

      case 'select_commission_5':
        await handleSelectCommission(query, 5, services);
        break;

      case 'select_commission_10':
        await handleSelectCommission(query, 10, services);
        break;

      case 'select_commission_15':
        await handleSelectCommission(query, 15, services);
        break;

      case 'select_commission_20':
        await handleSelectCommission(query, 20, services);
        break;

      case 'skip_deal':
        // Пропустить сделку
        await handleSkipDeal(query, services);
        break;

      case 'buy_deal_credit_card':
        // Покупка сделки кредиткой
        await handleBuyDealWithCreditCard(query, services);
        break;

      case 'increase_quantity_1':
        // Увеличить количество на 1
        await handleChangeQuantity(query, 1, services);
        break;

      case 'decrease_quantity_1':
        // Уменьшить количество на 1
        await handleChangeQuantity(query, -1, services);
        break;

      case 'increase_quantity_10':
        // Увеличить количество на 10
        await handleChangeQuantity(query, 10, services);
        break;

      case 'decrease_quantity_10':
        // Уменьшить количество на 10
        await handleChangeQuantity(query, -10, services);
        break;

      case 'decrease_quantity_100':
        // Уменьшить количество на 100
        await handleChangeQuantity(query, -100, services);
        break;

      case 'increase_quantity_100':
        // Увеличить количество на 100
        await handleChangeQuantity(query, 100, services);
        break;

      case 'sell_stocks':
        // Продажа акций
        await handleSellStocks(query, services);
        break;

      case 'pay_expenses':
        // Оплата расходов
        await handlePayExpenses(query, services);
        break;

      case 'pay_miscellaneous':
        // Оплата miscellaneous
        await handlePayMiscellaneous(query, services);
        break;

      case 'pay_miscellaneous_credit_card':
        // Оплата miscellaneous кредиткой
        await handlePayMiscellaneousCreditCard(query, services);
        break;

      case 'skip_miscellaneous':
        // Пропуск miscellaneous
        await handleSkipMiscellaneous(query, services);
        break;

      case 'donate_charity':
        // Пожертвование на благотворительность
        await handleDonateCharity(query, services);
        break;

      case 'skip_charity':
        // Пропуск благотворительности
        await handleSkipCharity(query, services);
        break;

      case 'profile':
        // Показать профиль игрока
        await handleProfile(query, services);
        break;

      case 'stats':
        // Показать статистику игры
        await handleStats(query, services);
        break;

      case 'assets':
        // Показать активы игрока
        await handleAssets(query, services);
        break;

      case 'credits':
        // Показать кредиты игрока
        await handleCredits(query, services);
        break;

      case 'cancel_offer':
        // Отменить предложение сделки
        await handleCancelOffer(query, services);
        break;

      default:
        // Проверяем, является ли callback_data выбором пользователя для предложения сделки
        if (data.startsWith('select_user_')) {
          const targetUserId = parseInt(data.split('_')[2], 10);
          await handleSelectUser(query, targetUserId, services);
        }
        // Обработчики банкротства
        else if (data.startsWith('sell_asset_')) {
          const assetIndex = parseInt(data.split('_')[2], 10);
          await handleSellAsset(query, assetIndex, services);
        }
        else if (data.startsWith('pay_liability_')) {
          const liabilityIndex = parseInt(data.split('_')[2], 10);
          await handlePayLiability(query, liabilityIndex, services);
        }
        else if (data.startsWith('assets_page_')) {
          const page = parseInt(data.split('_')[2], 10);
          await handleAssetsPage(query, page, services);
        }
        else if (data.startsWith('credits_page_')) {
          const page = parseInt(data.split('_')[2], 10);
          await handleCreditsPage(query, page, services);
        }
        else {
          console.warn('Unknown callback data:', data);
        }
    }
  } catch (error) {
    console.error('Error in handleCallbackQuery:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка. Попробуйте еще раз.');
  }
}

/**
 * Обрабатывает предложение сделки другому игроку
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleOfferDeal(query, services) {
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
    if (!deal || !deal.canSellToOthers) {
      await messageService.sendErrorMessage(chatId, 'Эта сделка не может быть предложена другим игрокам.');
      return;
    }

    // Инициализировать предложение сделки
    const { initializeDealOffer } = require('../utils/dealOffer');
    await initializeDealOffer(game.gameId, userId, services);

    // Обновить сообщение с новым состоянием
    const updatedGame = await gameService.getGame(game.gameId);
    const content = messageService.generateDealCardContent(deal, currentPlayer, updatedGame, updatedGame.currentDealQuantity);

    await messageService.editMessageText(chatId, query.message.message_id, content.text, {
      parse_mode: 'Markdown',
      reply_markup: content.keyboard
    });

  } catch (error) {
    console.error('Error in handleOfferDeal:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при предложении сделки.');
  }
}

/**
 * Обрабатывает выбор комиссии для предложения сделки
 * @param {Object} query - Callback query от Telegram
 * @param {number} commission - Выбранная комиссия (%)
 * @param {Object} services - Объект с сервисами
 */
async function handleSelectCommission(query, commission, services) {
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

    // Обработать выбор комиссии
    const { processOfferStep } = require('../utils/dealOffer');
    await processOfferStep(game.gameId, userId, chatId, 'select_commission', { commission }, services);

    // Получить обновлённую игру и игрока
    const updatedGame = await gameService.getGame(game.gameId);
    const currentPlayer = await gameService.getCurrentPlayer(updatedGame.gameId);

    // Обновить сообщение с новым состоянием
    const content = messageService.generateDealCardContent(updatedGame.currentDeal, currentPlayer, updatedGame, updatedGame.currentDealQuantity);

    await messageService.editMessageText(chatId, query.message.message_id, content.text, {
      parse_mode: 'Markdown',
      reply_markup: content.keyboard
    });

  } catch (error) {
    console.error('Error in handleSelectCommission:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при выборе комиссии.');
  }
}

/**
 * Обрабатывает выбор пользователя для предложения сделки
 * @param {Object} query - Callback query от Telegram
 * @param {string} targetUserId - ID выбранного пользователя
 * @param {Object} services - Объект с сервисами
 */
async function handleSelectUser(query, targetUserId, services) {
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

    // Обработать выбор пользователя
    const { processOfferStep } = require('../utils/dealOffer');
    await processOfferStep(game.gameId, userId, chatId, 'select_user', { targetUserId }, services);

    // Получить обновлённую игру и игрока
    const updatedGame = await gameService.getGame(game.gameId);
    const currentPlayer = await gameService.getCurrentPlayer(updatedGame.gameId);

    // Обновить сообщение с новым состоянием
    const content = messageService.generateDealCardContent(updatedGame.currentDeal, currentPlayer, updatedGame, updatedGame.currentDealQuantity);

    await messageService.editMessageText(chatId, query.message.message_id, content.text, {
      parse_mode: 'Markdown',
      reply_markup: content.keyboard
    });

  } catch (error) {
    console.error('Error in handleSelectUser:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при выборе пользователя.');
  }
}

/**
 * Обрабатывает отмену предложения сделки
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleCancelOffer(query, services) {
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

    // Обработать отмену предложения
    const { processOfferStep } = require('../utils/dealOffer');
    await processOfferStep(game.gameId, userId, chatId, 'cancel', {}, services);

    // Получить обновлённую игру и игрока
    const updatedGame = await gameService.getGame(game.gameId);
    const currentPlayer = await gameService.getCurrentPlayer(updatedGame.gameId);

    // Обновить сообщение с обычным видом
    const content = messageService.generateDealCardContent(updatedGame.currentDeal, currentPlayer, updatedGame, updatedGame.currentDealQuantity);

    await messageService.editMessageText(chatId, query.message.message_id, content.text, {
      parse_mode: 'Markdown',
      reply_markup: content.keyboard
    });

  } catch (error) {
    console.error('Error in handleCancelOffer:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при отмене предложения.');
  }
}

/**
 * Обрабатывает продажу актива в банкротстве
 * @param {Object} query - Callback query от Telegram
 * @param {number} assetIndex - Индекс актива
 * @param {Object} services - Объект с сервисами
 */
async function handleSellAsset(query, assetIndex, services) {
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

    // Продать актив
    const sellResult = await gameService.sellAssetWithBankruptcy(game.gameId, userId, assetIndex);
    if (!sellResult.success) {
      await messageService.sendErrorMessage(chatId, 'Ошибка продажи актива: ' + sellResult.error);
      return;
    }

    // Проверить, разрешена ли банкротство
    const checkResult = await gameService.checkBankruptcyResolution(game.gameId, userId);
    if (checkResult.success && checkResult.resolved) {
      // Банкротство разрешена - завершить
      await gameService.endBankruptcy(game.gameId, userId, false);
      await messageService.sendErrorMessage(chatId, 'Банкротство разрешено! Вы пропускаете 3 хода.');

      // Передать ход следующему игроку
      const nextTurnResult = await gameService.nextTurn(game.gameId);
      if (nextTurnResult.success && nextTurnResult.nextPlayer) {
        await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
      }
    } else {
    // Продолжить банкротство - обновить сообщение активов
    const updatedGame = await gameService.getGame(game.gameId);
    const updatedPlayer = updatedGame.players.find(p => p.userId === userId);
    await messageService.sendPlayerAssetsMessage(chatId, updatedPlayer, 0, query.message.message_id);
    }

  } catch (error) {
    console.error('Error in handleSellAsset:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при продаже актива.');
  }
}

/**
 * Обрабатывает оплату долга в банкротстве
 * @param {Object} query - Callback query от Telegram
 * @param {number} liabilityIndex - Индекс долга
 * @param {Object} services - Объект с сервисами
 */
async function handlePayLiability(query, liabilityIndex, services) {
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

    // Оплатить долг
    const payResult = await gameService.payLiability(game.gameId, userId, liabilityIndex);
    if (!payResult.success) {
      if (payResult.error === 'insufficient_funds') {
        // Проверяем, может ли игрок оплатить хотя бы один кредит
        const hasAssets = currentPlayer.assets && currentPlayer.assets.length > 0;
        const hasLiabilities = currentPlayer.liabilities && currentPlayer.liabilities.length > 0;

        let canPayAnyLiability = false;
        if (hasLiabilities && currentPlayer.liabilities) {
          for (const liability of currentPlayer.liabilities) {
            if (currentPlayer.cash >= liability.loanAmount) {
              canPayAnyLiability = true;
              break;
            }
          }
        }

        if (!canPayAnyLiability && !hasAssets) {
          // Не может оплатить ни один кредит и нет активов - проигрыш
          await gameService.endBankruptcy(game.gameId, userId, true);
          await messageService.sendErrorMessage(chatId, '🥺 Вы проиграли! \nУ вас нет активов для продажи и недостаточно денег для оплаты кредитов.');

          // Передать ход следующему игроку
          const nextTurnResult = await gameService.nextTurn(game.gameId);
          if (nextTurnResult.success && nextTurnResult.nextPlayer) {
            await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
          }
          return;
        } else {
          // Может оплатить другие кредиты или есть активы - обычная ошибка
          await messageService.sendErrorMessage(chatId, 'Недостаточно денег для оплаты этого кредита');
        }
      } else {
        // Другая ошибка
        await messageService.sendErrorMessage(chatId, 'Ошибка оплаты долга: ' + payResult.error);
      }
      return;
    }

    // Проверить, разрешена ли банкротство
    const checkResult = await gameService.checkBankruptcyResolution(game.gameId, userId);
    if (checkResult.success && checkResult.resolved) {
      // Банкротство разрешена - завершить
      await gameService.endBankruptcy(game.gameId, userId, false);
      await messageService.sendErrorMessage(chatId, 'Банкротство разрешено! Вы пропускаете 3 хода.');

      // Передать ход следующему игроку
      const nextTurnResult = await gameService.nextTurn(game.gameId);
      if (nextTurnResult.success && nextTurnResult.nextPlayer) {
        await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
      }
    } else {
      // Продолжить банкротство - обновить сообщение кредитов
      const updatedGame = await gameService.getGame(game.gameId);
      const updatedPlayer = updatedGame.players.find(p => p.userId === userId);
      await messageService.sendPlayerCreditsMessage(chatId, updatedPlayer, 0, query.message.message_id);
    }

  } catch (error) {
    console.error('Error in handlePayLiability:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при оплате долга.');
  }
}

/**
 * Обрабатывает навигацию по страницам активов
 * @param {Object} query - Callback query от Telegram
 * @param {number} page - Номер страницы
 * @param {Object} services - Объект с сервисами
 */
async function handleAssetsPage(query, page, services) {
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

    // Обновить сообщение активов с новой страницей
    await messageService.sendPlayerAssetsMessage(chatId, currentPlayer, page, query.message.message_id);

  } catch (error) {
    console.error('Error in handleAssetsPage:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при навигации.');
  }
}

/**
 * Обрабатывает навигацию по страницам кредитов
 * @param {Object} query - Callback query от Telegram
 * @param {number} page - Номер страницы
 * @param {Object} services - Объект с сервисами
 */
async function handleCreditsPage(query, page, services) {
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

    // Обновить сообщение кредитов с новой страницей
    await messageService.sendPlayerCreditsMessage(chatId, currentPlayer, page, query.message.message_id);

  } catch (error) {
    console.error('Error in handleCreditsPage:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при навигации.');
  }
}

module.exports = {
  handleCallbackQuery,
  handleRollDice,
  handleOfferDeal,
  handleSelectCommission,
  handleSelectUser,
  handleCancelOffer,
  handleSellAsset,
  handlePayLiability,
  handleAssetsPage,
  handleCreditsPage
};
