const { formatNumber } = require('../utils');
const { FIELD_TYPES } = require('../game/board');

// Импорт функций из других модулей
const { handleDealType, handleBuyDeal, handleSkipDeal, handleBuyDealWithCreditCard, handleBuyMortgageDownPaymentWithCreditCard, handleChangeQuantity, handleSellStocks, handlePayExpenses } = require('./deals');
const { handleMiscellaneous, handlePayMiscellaneous, handlePayMiscellaneousCreditCard, handleSkipMiscellaneous } = require('./miscellaneous');
const { handleCharity, handleDonateCharity, handleSkipCharity } = require('./charity');
const { handleProfile, handleStats, handleAssets, handleCredits } = require('./profile');
const { handlePayFastTrack, handleRollDiceFastTrack, handleInvestFastTrack, handleSkipFastTrack } = require('./fastTrack');

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

    // Проверить, нужно ли пропустить ход
    if (currentPlayer.skippedTurns > 0) {
      // Отправить сообщение о пропуске хода
      await messageService.sendErrorMessage(chatId, `Игрок ${currentPlayer.username} пропускает ход!`);

      // Передать ход следующему игроку только если игра не завершена
      const nextTurnResult = await gameService.nextTurn(game.gameId);
      if (nextTurnResult.success && nextTurnResult.nextPlayer && !nextTurnResult.gameFinished) {
        if (nextTurnResult.transitioned) {
          await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer);
        }
        await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
      }
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

    // Проверить, стал ли игрок банкротом после перемещения
    const updatedGame = await gameService.getGame(game.gameId);
    const updatedPlayer = updatedGame.players.find(p => p.userId === userId);
    if (updatedPlayer && updatedPlayer.bankruptcyState) {
      // Игрок стал банкротом - сразу показать интерфейс банкротства и не передавать ход
      await messageService.sendPlayerTurnMessage(chatId, updatedPlayer);
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
    } else if (moveResult.fieldType === FIELD_TYPES.DISMISSAL) {
      // Игрок попал на поле "Безработица" - показать комбинированное сообщение
      await messageService.sendCombinedRollMoveDismissalMessage(
        chatId,
        currentPlayer,
        steps,
        moveResult.newPosition,
        moveResult.paydayEvents || []
      );

      // Уменьшить счетчик ходов благотворительности
      if (currentPlayer.charityEffect && currentPlayer.charityTurnsLeft > 0) {
        await gameService.decreaseCharityTurns(game.gameId, userId);
      }

      // Для поля DISMISSAL не передаем ход следующему игроку - ждем оплаты
    } else if (moveResult.fieldType === FIELD_TYPES.CHILD) {
      // Игрок попал на поле "Ребенок" - обработать рождение ребенка
      await gameService.processChildBirth(game.gameId, userId);

      // Получить обновленные данные игрока
      const updatedGame = await gameService.getGame(game.gameId);
      const updatedPlayer = updatedGame.players.find(p => p.userId === userId);

      // Показать комбинированное сообщение
      await messageService.sendCombinedRollMoveChildMessage(
        chatId,
        updatedPlayer,
        steps,
        moveResult.newPosition,
        moveResult.paydayEvents || []
      );

      // Уменьшить счетчик ходов благотворительности
      if (currentPlayer.charityEffect && currentPlayer.charityTurnsLeft > 0) {
        await gameService.decreaseCharityTurns(game.gameId, userId);
      }

      // Для поля CHILD передаем ход следующему игроку - автоматическое событие
      const nextTurnResult = await gameService.nextTurn(game.gameId);
      if (nextTurnResult.success && nextTurnResult.nextPlayer) {
        if (nextTurnResult.transitioned) {
          await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer);
        }
        await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
      }
    } else if (moveResult.fieldType === FIELD_TYPES.MARKET) {
      // Игрок попал на поле "Рынок" - отправить комбинированное сообщение
      const { handleMarket } = require('./market');
      const marketCard = await handleMarket(game.gameId, services);

      // Получить обновленную игру после применения эффектов
      const updatedGame = await gameService.getGame(game.gameId);
      const updatedPlayer = updatedGame.players.find(p => p.userId === userId);

      // Отправить комбинированное сообщение с броском кубика и market карточкой
      await messageService.sendCombinedRollMoveMarketMessage(
        chatId,
        updatedPlayer,
        steps,
        moveResult.newPosition,
        moveResult.paydayEvents || [],
        marketCard
      );

      // Уменьшить счетчик ходов благотворительности
      if (currentPlayer.charityEffect && currentPlayer.charityTurnsLeft > 0) {
        await gameService.decreaseCharityTurns(game.gameId, userId);
      }

      // Для поля MARKET не передаем ход автоматически - ждем действий игроков
    } else if (moveResult.fieldType === FIELD_TYPES.INVESTING || moveResult.fieldType === FIELD_TYPES.EXPENSES || moveResult.fieldType === FIELD_TYPES.DREAM || moveResult.fieldType === FIELD_TYPES.PAYDAY) {
      // Игрок попал на поле "Инвестиция", "Расходы", "Мечта" или "День выплат" - обработать fastTrack событие
      const { handleFastTrack } = require('./fastTrack');
      const { FAST_TRACK_FIELDS } = require('../game/board');
      const fieldData = FAST_TRACK_FIELDS[moveResult.newPosition % FAST_TRACK_FIELDS.length];

      // Уменьшить счетчик ходов благотворительности
      if (currentPlayer.charityEffect && currentPlayer.charityTurnsLeft > 0) {
        await gameService.decreaseCharityTurns(game.gameId, userId);
      }

      // Обработать fastTrack событие
      await handleFastTrack(game.gameId, userId, fieldData, services);

      // Показать комбинированное сообщение с fastTrack событием
      await messageService.sendCombinedRollMoveFastTrackMessage(
        chatId,
        currentPlayer,
        steps,
        moveResult.newPosition,
        moveResult.paydayEvents || [],
        fieldData,
        game,
        gameService
      );

      // Для поля PAYDAY передаем ход автоматически - никаких действий не требуется
      if (moveResult.fieldType === FIELD_TYPES.PAYDAY) {
        const nextTurnResult = await gameService.nextTurn(game.gameId);
        if (nextTurnResult.success && nextTurnResult.nextPlayer && !nextTurnResult.gameFinished) {
          if (nextTurnResult.transitioned) {
            await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer);
          }
          await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
        }
      }
      // Для полей INVESTING, EXPENSES, DREAM не передаем ход автоматически - ждем действий игрока
    } else {
      // Обычное поле - отправить стандартное сообщение и передать ход
      if (moveResult.inFastTrack) {
        await messageService.sendFastTrackRollMoveMessage(
          chatId,
          currentPlayer,
          steps,
          moveResult.newPosition,
          moveResult.paydayEvents || []
        );
      } else {
        await messageService.sendCombinedRollMovePaydayMessage(
          chatId,
          currentPlayer,
          steps,
          moveResult.newPosition,
          moveResult.fieldType,
          moveResult.paydayEvents || []
        );
      }

      // Уменьшить счетчик ходов благотворительности
      if (currentPlayer.charityEffect && currentPlayer.charityTurnsLeft > 0) {
        await gameService.decreaseCharityTurns(game.gameId, userId);
      }

      // TODO: Обработать другие события на поле (финансовые изменения, эффекты)

      // Передать ход следующему игроку только если игра не завершена
      const nextTurnResult = await gameService.nextTurn(game.gameId);
      if (nextTurnResult.success && nextTurnResult.nextPlayer && !nextTurnResult.gameFinished) {
        if (nextTurnResult.transitioned) {
          await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer);
        }
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

        // Получить список уже выбранных мечтаний
        const selectedDreams = existingGame.players
          .filter(p => p.dream && p.userId !== joinResult.player.userId)
          .map(p => p.dream.id);

        // Отправить выбор мечты новому игроку
        const messageId = await messageService.sendDreamSelectionMessage(chatId, joinResult.player, 0, null, selectedDreams);
        // Сохранить ID сообщения мечты для игрока
        const playerIndex = existingGame.players.length; // Индекс нового игрока
        await gameService.databaseService.getDb().collection('games').updateOne(
          { gameId: existingGame.gameId },
          {
            $set: {
              [`players.${playerIndex}.dreamMessageId`]: messageId
            }
          }
        );

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

      // Отправить выбор мечты создателю
      const game = await gameService.getGame(gameId);
      const player = game.players.find(p => p.userId === userId);
      if (player) {
        const messageId = await messageService.sendDreamSelectionMessage(chatId, player, 0, null, []);
        // Сохранить ID сообщения мечты для создателя
        await gameService.databaseService.getDb().collection('games').updateOne(
          { gameId },
          {
            $set: {
              [`players.0.dreamMessageId`]: messageId
            }
          }
        );
      }

      // Отправить карточку игрока создателю
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

      case 'roll_dice_3':
        // Бросок 3 кубиков (режим благотворительности на Fast Track)
        await handleRollDice(query, 3, services);
        break;

      case 'end_game_vote':
        // Обработать голос за окончание игры
        const commands = require('./commands');
        await commands.handleEndGameVote(query, services);
        break;

      case 'kick_player':
        // Обработать голос за исключение игрока
        await handleKickPlayerVote(query, services);
        break;

      case 'cancel_kick_vote':
        // Отменить голосование за исключение игрока
        await handleCancelKickVote(query, services);
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

      case 'buy_mortgage_down_payment_credit_card':
        // Покупка первоначального взноса кредиткой для ипотечной сделки
        await handleBuyMortgageDownPaymentWithCreditCard(query, services);
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

      case 'pay_dismissal':
        // Оплата расходов на поле безработицы
        await handlePayDismissal(query, services);
        break;

      case 'pay_dismissal_credit_card':
        // Оплата расходов на поле безработицы кредиткой
        await handlePayDismissalCreditCard(query, services);
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

      case 'skip_market':
        // Пропустить market событие
        const { handleSkipMarket } = require('./market');
        await handleSkipMarket(query, services);
        break;

      case 'charity_1':
        // Благотворительность - бросить 1 кубик
        await handleCharityFastTrack(query, services, 1);
        break;

      case 'charity_2':
        // Благотворительность - бросить 2 кубика
        await handleCharityFastTrack(query, services, 2);
        break;

      case 'charity_3':
        // Благотворительность - бросить 3 кубика
        await handleCharityFastTrack(query, services, 3);
        break;

      case 'pay_fastTrack':
        // Оплата fastTrack события
        await handlePayFastTrack(query, services);
        break;

      case 'invest_fastTrack':
        // Инвестирование в fastTrack поле
        await handleInvestFastTrack(query, services);
        break;

      case 'roll_dice_fastTrack':
        // Бросок кубика для fastTrack
        await handleRollDiceFastTrack(query, services);
        break;

      case 'skip_fastTrack':
        // Пропуск fastTrack события
        await handleSkipFastTrack(query, services);
        break;

      case 'buy_dream':
        // Покупка мечты
        await handleBuyDream(query, services);
        break;

      case 'skip_dream':
        // Пропуск мечты
        await handleSkipDream(query, services);
        break;

      default:
        // Проверяем market callback
        if (data.startsWith('sell_market_asset_')) {
          const assetIndex = parseInt(data.split('_')[3], 10);
          const { handleSellMarketAsset } = require('./market');
          await handleSellMarketAsset(query, assetIndex, services);
        }
        // Проверяем, является ли callback_data выбором пользователя для предложения сделки
        else if (data.startsWith('select_user_')) {
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
        else if (data.startsWith('select_dream_')) {
          const dreamTitle = data.replace('select_dream_', '');
          await handleSelectDream(query, dreamTitle, services);
        }
        else if (data.startsWith('dream_page_')) {
          const page = parseInt(data.split('_')[2], 10);
          await handleDreamPage(query, page, services);
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
        if (nextTurnResult.transitioned) {
          await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer);
        }
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
        // Логика потери игры только для банкротства
        if (currentPlayer.bankruptcyState) {
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
            await messageService.sendGameLostMessage(chatId);

            // Передать ход следующему игроку
            const nextTurnResult = await gameService.nextTurn(game.gameId);
            if (nextTurnResult.success && nextTurnResult.nextPlayer) {
              if (nextTurnResult.transitioned) {
                await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer);
              }
              await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
            }
            return;
          } else {
            // Может оплатить другие кредиты или есть активы - обычная ошибка
            await messageService.sendErrorMessage(chatId, 'Недостаточно денег для оплаты этого кредита');
          }
        } else {
          // При добровольной оплате - просто ошибка
          await messageService.sendErrorMessage(chatId, 'Недостаточно денег для оплаты этого кредита');
        }
      } else {
        // Другая ошибка
        await messageService.sendErrorMessage(chatId, 'Ошибка оплаты долга: ' + payResult.error);
      }
      return;
    }

    // Для банкротства проверяем разрешение
    if (currentPlayer.bankruptcyState) {
      // Проверить, разрешена ли банкротство
      const checkResult = await gameService.checkBankruptcyResolution(game.gameId, userId);
      if (checkResult.success && checkResult.resolved) {
        // Банкротство разрешена - завершить
        await gameService.endBankruptcy(game.gameId, userId, false);
        await messageService.sendErrorMessage(chatId, 'Банкротство разрешено! Вы пропускаете 3 хода.');

        // Передать ход следующему игроку
        const nextTurnResult = await gameService.nextTurn(game.gameId);
        if (nextTurnResult.success && nextTurnResult.nextPlayer) {
          if (nextTurnResult.transitioned) {
            await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer);
          }
          await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
        }
        return;
      }
    }

    // Для добровольной оплаты или продолжения банкротства - обновить сообщение кредитов
    const updatedGame = await gameService.getGame(game.gameId);
    const updatedPlayer = updatedGame.players.find(p => p.userId === userId);
    await messageService.sendPlayerCreditsMessage(chatId, updatedPlayer, 0, query.message.message_id);

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

/**
 * Обрабатывает оплату расходов на поле безработицы
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handlePayDismissal(query, services) {
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

    const amount = currentPlayer.totalExpenses;

    // Проверить хватает ли денег
    if (currentPlayer.cash < amount) {
      // Удалить кнопки с сообщения
      await messageService.removeMessageKeyboard(chatId, query.message.message_id);
      // Показать предложение кредитки
      const dismissalObj = {
        title: 'Оплата расходов на безработице',
        cost: amount
      };
      await messageService.sendCreditCardOfferMessage(chatId, dismissalObj, currentPlayer, 'dismissal');
      return;
    }

    // Оплатить
    const newCash = currentPlayer.cash - amount;
    const playerIndex = game.players.findIndex(p => p.userId === userId);

    await gameService.databaseService.getDb().collection('games').updateOne(
      { gameId: game.gameId },
      {
        $set: {
          [`players.${playerIndex}.cash`]: newCash,
          [`players.${playerIndex}.skippedTurns`]: 2
        }
      }
    );

    // Удалить кнопки с сообщения
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Отправить сообщение об успешной оплате
    await messageService.sendErrorMessage(chatId, `✅ ${currentPlayer.username} оплатил расходы на безработице и пропускает 2 хода!`);

    // Передать ход следующему игроку только если игра не завершена
    const nextTurnResult = await gameService.nextTurn(game.gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer && !nextTurnResult.gameFinished) {
      if (nextTurnResult.transitioned) {
        await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer);
      }
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
    }

  } catch (error) {
    console.error('Error in handlePayDismissal:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при оплате расходов на безработице.');
  }
}

/**
 * Обрабатывает оплату расходов на поле безработицы кредиткой
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handlePayDismissalCreditCard(query, services) {
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

    const amount = currentPlayer.totalExpenses;
    const monthlyPayment = Math.floor(amount * 0.02);

    // Создать liability для кредитки
    const liability = {
      title: `Кредитная карта - Оплата расходов на безработице`,
      cost: amount,
      loanAmount: amount,
      monthlyPayment: monthlyPayment,
      type: 'credit_card_loan'
    };

    await gameService.addLiability(game.gameId, userId, liability);

    // Установить skippedTurns
    const playerIndex = game.players.findIndex(p => p.userId === userId);
    await gameService.databaseService.getDb().collection('games').updateOne(
      { gameId: game.gameId },
      {
        $set: {
          [`players.${playerIndex}.skippedTurns`]: 2
        }
      }
    );

    // Удалить кнопки с сообщения
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Отправить сообщение об успешной оплате
    await messageService.sendErrorMessage(chatId, `✅ ${currentPlayer.username} оплатил расходы на безработице кредиткой и пропускает 2 хода!`);

    // Передать ход следующему игроку
    const nextTurnResult = await gameService.nextTurn(game.gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      if (nextTurnResult.transitioned) {
        await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer);
      }
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
    }

  } catch (error) {
    console.error('Error in handlePayDismissalCreditCard:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при оплате расходов на безработице кредиткой.');
  }
}

/**
 * Обрабатывает благотворительность на Fast Track
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 * @param {number} diceCount - Количество кубиков (1, 2 или 3)
 */
async function handleCharityFastTrack(query, services, diceCount) {
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

    // Активировать постоянную благотворительность для Fast Track
    await gameService.databaseService.getDb().collection('games').updateOne(
      { gameId: game.gameId },
      {
        $set: {
          [`players.${game.players.indexOf(currentPlayer)}.charityEffect`]: true
        }
      }
    );

    // Удалить кнопки с сообщения
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Отправить сообщение об активации благотворительности
    await messageService.sendErrorMessage(chatId, `🎲 ${currentPlayer.username} активировал благотворительность! Теперь можно бросать ${diceCount} кубика(ов) за ход.`);

    // Передать ход следующему игроку
    const nextTurnResult = await gameService.nextTurn(game.gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      if (nextTurnResult.transitioned) {
        await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer);
      }
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
    }

  } catch (error) {
    console.error('Error in handleCharityFastTrack:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при активации благотворительности.');
  }
}

/**
 * Обрабатывает выбор мечты игроком
 * @param {Object} query - Callback query от Telegram
 * @param {string} dreamTitle - Название выбранной мечты
 * @param {Object} services - Объект с сервисами
 */
async function handleSelectDream(query, dreamTitle, services) {
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

    // Найти мечту по ID
    const { FAST_TRACK_FIELDS, FIELD_TYPES } = require('../game/board');
    const selectedDream = FAST_TRACK_FIELDS.find(field =>
      field.type === FIELD_TYPES.DREAM && field.id === dreamTitle
    );

    if (!selectedDream) {
      await messageService.sendErrorMessage(chatId, 'Мечта не найдена.');
      return;
    }

    // Проверить, что эта мечта еще не выбрана другим игроком
    const playersDreamIds = game.players.map(p => p.dream ? p.dream.id : null).filter(id => id);
    if (playersDreamIds.includes(selectedDream.id)) {
      await messageService.sendErrorMessage(chatId, 'Эта мечта уже выбрана другим игроком!');
      return;
    }

    // Сохранить выбранную мечту
    await gameService.databaseService.setPlayerDream(game.gameId, userId, selectedDream);

    // Удалить сообщение выбора мечты
    await messageService.deleteMessage(chatId, query.message.message_id);

    // Отправить сообщение о выборе мечты
    await messageService.sendErrorMessage(chatId, `🎯 ${query.from.first_name || query.from.username || 'Игрок'} выбрал мечту: "${selectedDream.title}"`);

    // Обновить комнату ожидания
    const updatedGame = await gameService.getGame(game.gameId);
    if (game.waitingMessageId) {
      await messageService.updateWaitingRoomMessage(chatId, game.waitingMessageId, updatedGame);
    }

  } catch (error) {
    console.error('Error in handleSelectDream:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при выборе мечты.');
  }
}

/**
 * Обрабатывает пагинацию списка мечтаний
 * @param {Object} query - Callback query от Telegram
 * @param {number} page - Номер страницы
 * @param {Object} services - Объект с сервисами
 */
async function handleDreamPage(query, page, services) {
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

    // Найти игрока, который выбирает мечту
    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      await messageService.sendErrorMessage(chatId, 'Игрок не найден в игре.');
      return;
    }

    // Получить список уже выбранных мечтаний
    const selectedDreams = game.players
      .filter(p => p.dream && p.userId !== player.userId)
      .map(p => p.dream.id);

    // Обновить сообщение с новой страницей мечтаний
    await messageService.sendDreamSelectionMessage(chatId, player, page, query.message.message_id, selectedDreams);

  } catch (error) {
    console.error('Error in handleDreamPage:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при навигации.');
  }
}

/**
 * Обрабатывает покупку мечты
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleBuyDream(query, services) {
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

    // Получить сохраненное fastTrack событие (мечту)
    const dreamField = game.currentFastTrack;
    if (!dreamField || dreamField.type !== 'dream') {
      await messageService.sendErrorMessage(chatId, 'Мечта не найдена.');
      return;
    }

    // Купить мечту
    const buyResult = await gameService.buyDream(game.gameId, userId, dreamField, game.players);
    if (!buyResult.success) {
      if (buyResult.error === 'insufficient_funds') {
        await messageService.sendErrorMessage(chatId, '❌ Недостаточно денег для покупки мечты.');
        return;
      } else {
        await messageService.sendErrorMessage(chatId, 'Ошибка покупки мечты.');
        return;
      }
    }

    // Удалить кнопки с сообщения
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Проверить, победил ли игрок
    if (buyResult.victory) {
      // Игрок победил - обработать победу
      const victoryResult = await gameService.finishGameWithVictory(game.gameId, userId, 'dream_purchase');

      // Отправить сообщение о победе
      await messageService.sendErrorMessage(chatId, `🎉 ${currentPlayer.username} купил свою мечту и ПОБЕДИЛ!`);

      if (victoryResult.gameFinished) {
        // Игра полностью завершена (все игроки победили)
        await messageService.sendGameFinishedMessage(chatId);
        return;
      } else {
        // Игрок вышел из игры, но игра продолжается для остальных
        // Не передаем ход, так как победивший игрок уже удален из массива
        return;
      }
    } else {
      // Просто купил мечту другого игрока или ничью
      const costText = buyResult.cost === dreamField.cost ? `${formatNumber(buyResult.cost)} ₽` : `${formatNumber(buyResult.cost)} ₽ (удвоено)`;
      await messageService.sendErrorMessage(chatId, `✅ ${currentPlayer.username} купил мечту за ${costText}`);

      // Передать ход следующему игроку
      const nextTurnResult = await gameService.nextTurn(game.gameId);
      if (nextTurnResult.success && nextTurnResult.nextPlayer) {
        if (nextTurnResult.transitioned) {
          await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer);
        }
        await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
      }
    }

  } catch (error) {
    console.error('Error in handleBuyDream:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при покупке мечты.');
  }
}

/**
 * Обрабатывает пропуск мечты
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleSkipDream(query, services) {
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

    // Удалить кнопки с сообщения
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Отправить сообщение о пропуске
    await messageService.sendErrorMessage(chatId, `⏭️ ${currentPlayer.username} пропустил мечту`);

    // Передать ход следующему игроку
    const nextTurnResult = await gameService.nextTurn(game.gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      if (nextTurnResult.transitioned) {
        await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer);
      }
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
    }

  } catch (error) {
    console.error('Error in handleSkipDream:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при пропуске мечты.');
  }
}

/**
 * Обрабатывает голос за исключение игрока
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleKickPlayerVote(query, services) {
  const { gameService, messageService } = services;
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  try {
    // Найти активную игру в чате
    const game = await gameService.getActiveGameByChatId(chatId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.');
      return;
    }

    // Извлечь targetUserId из callback_data (kick_player_{userId})
    const targetUserId = data.replace('kick_player_', '');

    // Проверить, что цель существует в игре
    if (!game.players.some(player => player.userId === targetUserId)) {
      await messageService.sendErrorMessage(chatId, 'Целевой игрок не найден в игре.');
      return;
    }

    // Проверить, что пользователь - участник игры
    if (!game.players.some(player => player.userId === userId)) {
      await messageService.sendErrorMessage(chatId, 'Вы не участник этой игры.');
      return;
    }

    // Голосовать
    const voteResult = await gameService.voteToKickPlayer(userId, game.gameId, targetUserId);

    if (!voteResult.success) {
      await messageService.sendErrorMessage(chatId, `Ошибка голосования: ${voteResult.error}`);
      return;
    }

    // Обновить сообщение голосования
    const updatedGame = await gameService.getGame(game.gameId);
    await messageService.updateKickVoteMessage(chatId, query.message.message_id, updatedGame, updatedGame.kickVotes);

    // Проверить, достигнуто ли большинство
    if (voteResult.shouldKick && voteResult.kickedUserId) {
      const kickedPlayer = game.players.find(p => p.userId === voteResult.kickedUserId);

      // Удалить сообщение голосования
      if (updatedGame.kickMessageId) {
        await messageService.deleteMessage(chatId, updatedGame.kickMessageId);
      }

      // Отправить сообщение об исключении
      await messageService.sendErrorMessage(chatId, `🚫 ${kickedPlayer ? kickedPlayer.username : 'Игрок'} был исключен из игры!`);

      // Проверить, завершилась ли игра (остался 1 игрок)
      const finalGame = await gameService.getGame(game.gameId);
      if (finalGame && finalGame.status === 'finished' && finalGame.winner) {
        await messageService.sendErrorMessage(chatId, `🎉 ${finalGame.players.find(p => p.userId === finalGame.winner)?.username || 'Игрок'} победил!`);
        await messageService.sendGameFinishedMessage(chatId);
      }
    }

  } catch (error) {
    console.error('Error in handleKickPlayerVote:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при голосовании.');
  }
}

/**
 * Обрабатывает отмену голосования за исключение игрока
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleCancelKickVote(query, services) {
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

    // Очистить голосование (только если инициатор голосования)
    if (game.kickVotes && Object.keys(game.kickVotes).length > 0) {
      await gameService.databaseService.getDb().collection('games').updateOne(
        { gameId: game.gameId },
        {
          $set: {
            kickVotes: {},
            kickMessageId: null
          }
        }
      );

      // Удалить сообщение голосования
      await messageService.deleteMessage(chatId, query.message.message_id);

      // Отправить сообщение об отмене
      await messageService.sendErrorMessage(chatId, '❌ Голосование за исключение игрока отменено.');
    } else {
      await messageService.sendErrorMessage(chatId, 'Нет активного голосования для отмены.');
    }

  } catch (error) {
    console.error('Error in handleCancelKickVote:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при отмене голосования.');
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
  handleCreditsPage,
  handlePayDismissal,
  handlePayDismissalCreditCard,
  handleCharityFastTrack,
  handleSelectDream,
  handleDreamPage,
  handleBuyDream,
  handleSkipDream,
  handleKickPlayerVote,
  handleCancelKickVote
};
