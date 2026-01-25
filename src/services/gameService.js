class GameService {
  constructor(databaseService, userStatsService, messageService = null) {
    this.databaseService = databaseService;
    this.userStatsService = userStatsService;
    this.messageService = messageService;
  }

  /**
   * Создает новую игру
   * @param {string} chatId - ID чата
   * @param {string} userId - ID создателя игры
   * @param {string} username - Имя пользователя
   * @returns {Promise<string>} ID созданной игры
   */
  async createGame(chatId, userId, username) {
    return await this.databaseService.createGame(chatId, userId, username);
  }

  /**
   * Присоединяет игрока к существующей игре
   * @param {string} userId - ID игрока
   * @param {string} gameId - ID игры
   * @param {string} username - Имя пользователя
   * @returns {Promise<{success: boolean, error?: string, player?: Object}>} Результат операции
   */
  async joinGame(userId, gameId, username) {
    return await this.databaseService.joinGame(userId, gameId, username);
  }

  /**
   * Получает информацию об игре
   * @param {string} gameId - ID игры
   * @returns {Promise<Object|null>} Документ игры или null
   */
  async getGame(gameId) {
    return await this.databaseService.getGame(gameId);
  }

  /**
   * Начинает игру (меняет статус на 'active')
   * @param {string} userId - ID пользователя (должен быть создателем)
   * @param {string} gameId - ID игры
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async startGame(userId, gameId) {
    return await this.databaseService.startGame(userId, gameId);
  }

  /**
   * Получает список активных игр пользователя
   * @param {string} userId - ID пользователя
   * @returns {Promise<Array>} Массив игр пользователя
   */
  async getUserGames(userId) {
    return await this.databaseService.getUserGames(userId);
  }

  /**
   * Получает активную игру для чата
   * @param {string} chatId - ID чата
   * @returns {Promise<Object|null>} Документ игры или null
   */
  async getActiveGameByChatId(chatId) {
    return await this.databaseService.getActiveGameByChatId(chatId);
  }

  /**
   * Инициирует голосование за окончание игры
   * @param {string} userId - ID пользователя
   * @param {string} gameId - ID игры
   * @param {number} messageId - ID сообщения голосования
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async initiateEndGameVote(userId, gameId, messageId) {
    return await this.databaseService.initiateEndGameVote(userId, gameId, messageId);
  }

  /**
   * Голосует за окончание игры
   * @param {string} userId - ID пользователя
   * @param {string} gameId - ID игры
   * @returns {Promise<{success: boolean, error?: string, shouldFinish?: boolean}>} Результат операции
   */
  async voteToEndGame(userId, gameId) {
    return await this.databaseService.voteToEndGame(userId, gameId);
  }

  /**
   * Завершает игру
   * @param {string} gameId - ID игры
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async finishGame(gameId) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    if (game.status === 'finished') {
      return { success: false, error: 'already_finished' };
    }

    // Обновляем статистику перед завершением игры
    await this.userStatsService.updateStatsAfterGame(game);

    // Завершаем игру
    return await this.databaseService.finishGame(gameId);
  }

  /**
   * Инициирует голосование за исключение игрока
   * @param {string} userId - ID пользователя
   * @param {string} gameId - ID игры
   * @param {number} messageId - ID сообщения голосования
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async initiateKickVote(userId, gameId, messageId) {
    return await this.databaseService.initiateKickVote(userId, gameId, messageId);
  }

  /**
   * Голосует за исключение игрока
   * @param {string} userId - ID пользователя
   * @param {string} gameId - ID игры
   * @param {string} targetUserId - ID цели голосования
   * @returns {Promise<{success: boolean, error?: string, shouldKick?: boolean, kickedUserId?: string}>} Результат операции
   */
  async voteToKickPlayer(userId, gameId, targetUserId) {
    const voteResult = await this.databaseService.voteToKickPlayer(userId, gameId, targetUserId);

    if (voteResult.success && voteResult.shouldKick && voteResult.kickedUserId) {
      // Исключаем игрока
      const removeResult = await this.databaseService.removePlayerFromGame(gameId, voteResult.kickedUserId);

      if (removeResult.success) {
        // Обновляем статистику проигрыша для исключенного игрока
        await this.userStatsService.updateUserStats(voteResult.kickedUserId, { losses: (await this.userStatsService.getUserStats(voteResult.kickedUserId)).losses + 1 });

        // Проверяем, завершилась ли игра (остался 1 игрок)
        const game = await this.databaseService.getGame(gameId);
        if (game && game.status === 'finished' && game.winner) {
          // Обновляем статистику победы для оставшегося игрока
          await this.userStatsService.updateUserStats(game.winner, { wins: (await this.userStatsService.getUserStats(game.winner)).wins + 1 });
        }
      }
    }

    return voteResult;
  }

  /**
   * Удаляет игрока из игры
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока для удаления
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async removePlayerFromGame(gameId, userId) {
    return await this.databaseService.removePlayerFromGame(gameId, userId);
  }

  /**
   * Устанавливает ID сообщения комнаты ожидания
   * @param {string} gameId - ID игры
   * @param {number} messageId - ID сообщения
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setWaitingMessageId(gameId, messageId) {
    return await this.databaseService.setWaitingMessageId(gameId, messageId);
  }

  /**
   * Бросает кубик(и) и возвращает сумму очков
   * @param {number} diceCount - Количество кубиков (1 или 2)
   * @returns {number} Сумма выпавших очков
   */
  rollDice(diceCount = 1) {
    let total = 0;
    for (let i = 0; i < diceCount; i++) {
      total += Math.floor(Math.random() * 6) + 1; // Кубик от 1 до 6
    }
    return total;
  }

  /**
   * Перемещает игрока на заданное количество полей и обрабатывает события на пройденных полях
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {number} steps - Количество шагов
   * @returns {Promise<{success: boolean, error?: string, newPosition?: number, fieldType?: string, inFastTrack?: boolean, paydayEvents?: Array}>} Результат операции
   */
  async movePlayer(gameId, userId, steps) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, error: 'player_not_found' };
    }

    const { RAT_RACE_FIELDS, FAST_TRACK_FIELDS, RAT_RACE_SIZE, FAST_TRACK_SIZE, FIELD_TYPES } = require('../game/board');

    let currentPosition = player.position;
    let inFastTrack = player.inFastTrack;
    const currentTrack = inFastTrack ? FAST_TRACK_FIELDS : RAT_RACE_FIELDS;
    const trackSize = inFastTrack ? FAST_TRACK_SIZE : RAT_RACE_SIZE;
    const paydayEvents = [];

    // Проходим по всем полям в пути
    for (let i = 1; i <= steps; i++) {
      const position = (currentPosition + i) % trackSize;
      const field = currentTrack[position];

      // Обрабатываем PAYDAY
      if (field.type === FIELD_TYPES.FPAYDAY) {
        // На Fast Track PAYDAY дает fastTrackIncome
        const game = await this.databaseService.getGame(gameId);
        const player = game.players.find(p => p.userId === userId);
        const income = player.fastTrackIncome || 0;
        const newFastTrackCash = (player.fastTrackCash || 0) + income;

        await this.databaseService.getDb().collection('games').updateOne(
          { gameId },
          { $set: { [`players.${game.players.indexOf(player)}.fastTrackCash`]: newFastTrackCash } }
        );

        paydayEvents.push({
          position,
          cashFlow: income,
          newFastTrackCash
        });
      } else if (field.type === FIELD_TYPES.PAYDAY) {
        // На Rat Race PAYDAY дает обычный денежный поток
        const paydayResult = await this.processPayday(gameId, userId);
        if (paydayResult.success) {
          paydayEvents.push({
            position,
            cashFlow: paydayResult.cashFlow,
            newCash: paydayResult.newCash
          });
        }
      }
    }

    // Вычисляем новую позицию
    const newPosition = (currentPosition + steps) % trackSize;

    // Обновляем позицию в базе данных
    const updateResult = await this.databaseService.updatePlayerPosition(gameId, userId, newPosition, inFastTrack);
    if (!updateResult.success) {
      return updateResult;
    }

    // Определяем тип поля, на которое попал игрок
    const fieldType = currentTrack[newPosition].type;

    return {
      success: true,
      newPosition,
      fieldType,
      inFastTrack,
      paydayEvents
    };
  }

  /**
   * Возвращает текущего игрока
   * @param {string} gameId - ID игры
   * @returns {Promise<Object|null>} Текущий игрок или null
   */
  async getCurrentPlayer(gameId) {
    const game = await this.databaseService.getGame(gameId);
    if (!game || typeof game.currentPlayerIndex !== 'number') {
      return null;
    }

    return game.players[game.currentPlayerIndex] || null;
  }

  /**
   * Передает ход следующему игроку
   * @param {string} gameId - ID игры
   * @returns {Promise<{success: boolean, error?: string, nextPlayer?: Object}>} Результат операции
   */
  async nextTurn(gameId) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    let currentIndex = game.currentPlayerIndex;
    let nextIndex = (currentIndex + 1) % game.players.length;
    let nextPlayer = game.players[nextIndex];

    const { transitioned } = await this.checkAndTransitionToFastTrack(gameId, nextPlayer.userId)

    // Если произошел переход на Fast Track, заново получаем данные игрока
    if (transitioned) {
      const updatedGame = await this.databaseService.getGame(gameId);
      nextPlayer = updatedGame.players[nextIndex];
    }

    // Проверяем автоматическую победу на Fast Track
    const victoryCheck = await this.checkFastTrackVictory(gameId, nextPlayer.userId);
    if (victoryCheck.success && victoryCheck.victory) {
      // Игрок победил автоматически - завершаем игру
      await this.finishGameWithVictory(gameId, nextPlayer.userId, victoryCheck.reason);

      // Отправляем сообщение о победе (если есть messageService)
      await this.messageService.sendErrorMessage(
        game.chatId,
        `🎉 ${nextPlayer.username} достиг своей цели и победил на быстром круге!`
      );

      return {
        success: true,
        transitioned,
        nextPlayer,
        victory: true,
        reason: victoryCheck.reason,
        gameFinished: true
      };
    }

    // Обновляем индекс текущего игрока
    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      { $set: { currentPlayerIndex: nextIndex, diceRolledThisTurn: false } }
    );

    return {
      success: true,
      transitioned,
      nextPlayer
    };
  }

  /**
   * Устанавливает эффект благотворительности для игрока
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {boolean} effect - Включить/выключить эффект
   * @param {number} turnsLeft - Количество ходов (если effect = true)
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setCharityEffect(gameId, userId, effect, turnsLeft = 3) {
    return await this.databaseService.setCharityEffect(gameId, userId, effect, turnsLeft);
  }

  /**
   * Уменьшает счетчик ходов благотворительности
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @returns {Promise<{success: boolean, error?: string, turnsLeft?: number, effectEnded?: boolean}>} Результат операции
   */
  async decreaseCharityTurns(gameId, userId) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const player = game.players[playerIndex];

    if (!player.charityEffect || player.charityTurnsLeft <= 0) {
      return { success: true, turnsLeft: player.charityTurnsLeft || 0, effectEnded: false };
    }

    const newTurnsLeft = player.charityTurnsLeft - 1;
    const effectEnded = newTurnsLeft <= 0;

    const updateData = {
      [`players.${playerIndex}.charityTurnsLeft`]: newTurnsLeft
    };

    if (effectEnded) {
      updateData[`players.${playerIndex}.charityEffect`] = false;
    }

    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      { $set: updateData }
    );

    return {
      success: true,
      turnsLeft: newTurnsLeft,
      effectEnded
    };
  }

  /**
   * Обрабатывает пожертвование на благотворительность
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @returns {Promise<{success: boolean, error?: string, donationAmount?: number, turnsLeft?: number}>} Результат операции
   */
  async donateCharity(gameId, userId) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const player = game.players[playerIndex];
    const income = player.salary + player.passiveIncome;
    const donationAmount = Math.floor(income * 0.1);

    // Проверяем, хватает ли денег
    if (player.cash < donationAmount) {
      return { success: false, error: 'insufficient_funds' };
    }

    // Списываем деньги
    const newCash = player.cash - donationAmount;

    // Устанавливаем эффект благотворительности
    const turnsLeft = player.inFastTrack ? -1 : 3;

    // Обновляем данные игрока
    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      {
        $set: {
          [`players.${playerIndex}.cash`]: newCash,
          [`players.${playerIndex}.charityEffect`]: true,
          [`players.${playerIndex}.charityTurnsLeft`]: turnsLeft
        }
      }
    );

    return {
      success: true,
      donationAmount,
      turnsLeft
    };
  }

  /**
   * Обрабатывает событие поля "День выплат" - начисляет месячный денежный поток
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @returns {Promise<{success: boolean, error?: string, cashFlow?: number, newCash?: number, bankruptcyTriggered?: boolean}>} Результат операции
   */
  async processPayday(gameId, userId) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const player = game.players[playerIndex];
    const cashFlow = player.salary + player.passiveIncome - player.totalExpenses;
    const newCash = player.cash + cashFlow;

    // Проверяем условия банкротства
    const hasAssets = player.assets && player.assets.length > 0;
    const hasLiabilities = player.liabilities && player.liabilities.length > 0;
    const bankruptcyTriggered = newCash < 0 && cashFlow < 0 && (hasAssets || hasLiabilities);

    // Обновляем данные игрока
    const updateData = {
      [`players.${playerIndex}.cash`]: newCash,
      [`players.${playerIndex}.cashFlow`]: cashFlow
    };

    if (bankruptcyTriggered) {
      updateData[`players.${playerIndex}.bankruptcyState`] = true;
    }

    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      { $set: updateData }
    );

    return {
      success: true,
      cashFlow,
      newCash,
      bankruptcyTriggered
    };
  }

  /**
   * Обрабатывает событие поля "Ребенок" - добавляет ребенка и увеличивает расходы
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @returns {Promise<{success: boolean, error?: string, childrenCount?: number, childrenExpenses?: number, totalExpenses?: number}>} Результат операции
   */
  async processChildBirth(gameId, userId) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const player = game.players[playerIndex];

    // Проверяем максимальное количество детей
    const currentChildrenCount = player.childrenCount || 0;
    if (currentChildrenCount >= 3) {
      return { success: false, error: 'max_children_reached' };
    }

    // Получаем стоимость ребенка из профессии
    const kidCost = player.kidCost;

    // Увеличиваем количество детей
    const newChildrenCount = currentChildrenCount + 1;

    // Увеличиваем расходы на детей
    const newChildrenExpenses = newChildrenCount * kidCost;

    // Пересчитываем общие расходы
    const newTotalExpenses = player.expenses + newChildrenExpenses + player.totalLoanPayments;

    // Пересчитываем денежный поток
    const newCashFlow = player.salary + player.passiveIncome - newTotalExpenses;

    // Обновляем данные игрока
    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      {
        $set: {
          [`players.${playerIndex}.childrenCount`]: newChildrenCount,
          [`players.${playerIndex}.childrenExpenses`]: newChildrenExpenses,
          [`players.${playerIndex}.totalExpenses`]: newTotalExpenses,
          [`players.${playerIndex}.cashFlow`]: newCashFlow
        }
      }
    );

    return {
      success: true,
      childrenCount: newChildrenCount,
      childrenExpenses: newChildrenExpenses,
      totalExpenses: newTotalExpenses
    };
  }

  /**
   * Пересчитывает общие расходы игрока при изменениях
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @returns {Promise<{success: boolean, error?: string, totalExpenses?: number}>} Результат операции
   */
  async recalculateTotalExpenses(gameId, userId) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const player = game.players[playerIndex];
    const totalExpenses = player.expenses + player.childrenExpenses + player.totalLoanPayments;

    // Обновляем totalExpenses
    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      { $set: { [`players.${playerIndex}.totalExpenses`]: totalExpenses } }
    );

    return {
      success: true,
      totalExpenses
    };
  }

  /**
   * Покупает мелкую сделку
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {Object} deal - Объект сделки
   * @param {number} quantity - Количество для unlimitedStocks (по умолчанию 1)
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async buySmallDeal(gameId, userId, deal, quantity = 1) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, error: 'player_not_found' };
    }

    const totalCost = deal.cost * quantity;

    // Проверяем хватает ли денег
    if (player.cash < totalCost) {
      return { success: false, error: 'insufficient_funds' };
    }

    // Списываем стоимость
    const newCash = player.cash - totalCost;

    // Обновляем баланс
    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      { $set: { [`players.${game.players.indexOf(player)}.cash`]: newCash } }
    );

    // Добавляем актив
    const incomePerUnit = deal.passiveIncome || deal.cashFlow || 0;
    const totalIncome = incomePerUnit * quantity;

    const asset = {
      assetId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      id: deal.id,
      title: deal.title,
      cost: deal.cost,
      cashFlow: totalIncome,
      type: 'small_deal',
      description: deal.description,
      quantity: quantity,
      group_Id: deal.group_Id,
      isRealEstate: deal.isRealEstate || false
    };

    await this.databaseService.addAsset(gameId, userId, asset);

    return { success: true };
  }

  /**
   * Покупает мелкую сделку с ипотекой
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {Object} deal - Объект сделки
   * @param {number} quantity - Количество для unlimitedStocks (по умолчанию 1)
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async buySmallDealWithMortgage(gameId, userId, deal, quantity = 1) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, error: 'player_not_found' };
    }

    const totalCost = (deal.cost || 0) * quantity;
    const totalDownPayment = (deal.downPayment || 0) * quantity;
    const totalMortgage = (deal.mortgage || 0) * quantity;

    // Проверяем хватает ли денег на первоначальный взнос
    if (player.cash < totalDownPayment) {
      return { success: false, error: 'insufficient_down_payment', downPayment: totalDownPayment, availableCash: player.cash };
    }

    // Рассчитываем ежемесячный платеж по ипотеке (0.01% от стоимости)
    const monthlyMortgagePayment = Math.floor(totalCost * (0.01 + game.creditMultiple)); // 0.01%

    // Списываем первоначальный взнос
    const newCash = player.cash - totalDownPayment;

    // Обновляем баланс
    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      { $set: { [`players.${game.players.indexOf(player)}.cash`]: newCash } }
    );

    // Генерируем уникальный ID для связи актив-кредит
    const assetLiabilityId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    // Добавляем ипотеку
    const mortgageLiability = {
      title: deal.title,
      cost: totalCost,
      downPayment: totalDownPayment,
      loanAmount: totalMortgage,
      monthlyPayment: monthlyMortgagePayment,
      type: 'small_deal_mortgage',
      assetLiabilityId: assetLiabilityId
    };

    await this.databaseService.addLiability(gameId, userId, mortgageLiability);

    // Добавляем актив
    const incomePerUnit = deal.passiveIncome || deal.cashFlow || 0;
    const totalIncome = incomePerUnit * quantity;

    const asset = {
      assetId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      id: deal.id,
      title: deal.title,
      cost: totalCost,
      cashFlow: totalIncome,
      type: 'small_deal_mortgage',
      description: deal.description,
      quantity: quantity,
      group_Id: deal.group_Id,
      isRealEstate: deal.isRealEstate || false,
      assetLiabilityId: assetLiabilityId
    };

    await this.databaseService.addAsset(gameId, userId, asset);

    return { success: true };
  }

  /**
   * Покупает мелкую сделку с ипотекой и кредитом на первоначальный взнос
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {Object} deal - Объект сделки
   * @param {number} quantity - Количество для unlimitedStocks (по умолчанию 1)
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async buySmallDealWithMortgageAndCreditDownPayment(gameId, userId, deal, quantity = 1) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, error: 'player_not_found' };
    }

    const totalCost = deal.cost * quantity;
    const totalDownPayment = deal.downPayment * quantity;
    const totalMortgage = deal.mortgage * quantity;

    // Рассчитываем платежи
    const monthlyMortgagePayment = Math.floor(totalCost * (0.01 + game.creditMultiple)); // 0.01% от стоимости
    const monthlyCreditPayment = Math.floor(totalDownPayment * (0.02 + game.creditMultiple)); // 2% от первоначального взноса

    // Генерируем уникальный ID для связи актив-кредит
    const assetLiabilityId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    // Добавляем ипотеку
    const mortgageLiability = {
      title: deal.title,
      cost: totalCost,
      downPayment: totalDownPayment,
      loanAmount: totalMortgage,
      monthlyPayment: monthlyMortgagePayment,
      type: 'small_deal_mortgage',
      assetLiabilityId: assetLiabilityId
    };

    await this.databaseService.addLiability(gameId, userId, mortgageLiability);

    // Добавляем кредит на первоначальный взнос
    const creditLiability = {
      title: `Кредитная карта - Первоначальный взнос за ${deal.title}`,
      cost: totalDownPayment,
      loanAmount: totalDownPayment,
      monthlyPayment: monthlyCreditPayment,
      type: 'credit_card_loan'
    };

    await this.databaseService.addLiability(gameId, userId, creditLiability);

    // Добавляем актив
    const incomePerUnit = deal.passiveIncome || deal.cashFlow || 0;
    const totalIncome = incomePerUnit * quantity;

    const asset = {
      assetId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      id: deal.id,
      title: deal.title,
      cost: totalCost,
      cashFlow: totalIncome,
      type: 'small_deal_mortgage',
      description: deal.description,
      quantity: quantity,
      group_Id: deal.group_Id,
      isRealEstate: deal.isRealEstate || false,
      assetLiabilityId: assetLiabilityId
    };

    await this.databaseService.addAsset(gameId, userId, asset);

    return { success: true };
  }

  /**
   * Покупает крупную сделку с ипотекой и кредитом на первоначальный взнос
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {Object} deal - Объект сделки
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async buyBigDealWithMortgageAndCreditDownPayment(gameId, userId, deal) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, error: 'player_not_found' };
    }

    // Рассчитываем платежи
    const monthlyMortgagePayment = Math.floor(deal.cost * (0.01 + game.creditMultiple)); // 0.01% от стоимости
    const monthlyCreditPayment = Math.floor(deal.downPayment * (0.02 + game.creditMultiple)); // 2% от первоначального взноса

    // Генерируем уникальный ID для связи актив-кредит
    const assetLiabilityId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    // Добавляем ипотеку
    const mortgageLiability = {
      title: deal.title,
      cost: deal.cost,
      downPayment: deal.downPayment,
      loanAmount: deal.mortgage,
      monthlyPayment: monthlyMortgagePayment,
      type: 'big_deal_loan',
      assetLiabilityId: assetLiabilityId
    };

    await this.databaseService.addLiability(gameId, userId, mortgageLiability);

    // Добавляем кредит на первоначальный взнос
    const creditLiability = {
      title: `Кредитная карта - Первоначальный взнос за ${deal.title}`,
      cost: deal.downPayment,
      loanAmount: deal.downPayment,
      monthlyPayment: monthlyCreditPayment,
      type: 'credit_card_loan'
    };

    await this.databaseService.addLiability(gameId, userId, creditLiability);

    // Добавляем актив
    const asset = {
      assetId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      id: deal.id,
      title: deal.title,
      cost: deal.cost,
      cashFlow: deal.passiveIncome,
      type: 'big_deal',
      description: deal.description,
      isRealEstate: deal.isRealEstate || false,
      apartments: deal.apartments,
      assetLiabilityId: assetLiabilityId
    };

    await this.databaseService.addAsset(gameId, userId, asset);

    return { success: true };
  }

  /**
   * Покупает крупную сделку
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {Object} deal - Объект сделки
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async buyBigDeal(gameId, userId, deal) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, error: 'player_not_found' };
    }

    // Проверяем, является ли сделка с кредитом (наличие mortgage)
    if (deal.mortgage !== undefined) {
      // Сделка с кредитом: проверяем хватает ли денег на первоначальный взнос
      if (player.cash < deal.downPayment) {
        return { success: false, error: 'insufficient_down_payment', downPayment: deal.downPayment, availableCash: player.cash };
      }

      // Рассчитываем ежемесячный платеж по кредиту (0.01% от стоимости)
      const monthlyPayment = Math.floor(deal.cost * (0.01 + game.creditMultiple)); // 0.01%
      const loanAmount = deal.mortgage;

      // Списываем первоначальный взнос
      const newCash = player.cash - deal.downPayment;

      // Обновляем баланс
      await this.databaseService.getDb().collection('games').updateOne(
        { gameId },
        { $set: { [`players.${game.players.indexOf(player)}.cash`]: newCash } }
      );

      // Генерируем уникальный ID для связи актив-кредит
      const assetLiabilityId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

      // Добавляем актив
      const asset = {
        assetId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        id: deal.id,
        title: deal.title,
        cost: deal.cost,
        cashFlow: deal.passiveIncome,
        type: 'big_deal',
        description: deal.description,
        isRealEstate: deal.isRealEstate || false,
        apartments: deal.apartments,
        assetLiabilityId: assetLiabilityId
      };

      await this.databaseService.addAsset(gameId, userId, asset);

      // Добавляем кредит
      const liability = {
        title: deal.title,
        cost: deal.cost,
        downPayment: deal.downPayment,
        loanAmount: loanAmount,
        monthlyPayment: monthlyPayment,
        type: 'big_deal_loan',
        assetLiabilityId: assetLiabilityId
      };

      await this.databaseService.addLiability(gameId, userId, liability);
    } else {
      // Сделка без кредита: полная оплата за стоимость
      if (player.cash < deal.cost) {
        return { success: false, error: 'insufficient_funds' };
      }

      // Списываем полную стоимость
      const newCash = player.cash - deal.cost;

      // Обновляем баланс
      await this.databaseService.getDb().collection('games').updateOne(
        { gameId },
        { $set: { [`players.${game.players.indexOf(player)}.cash`]: newCash } }
      );

      // Добавляем актив
      const asset = {
        assetId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        id: deal.id,
        title: deal.title,
        cost: deal.cost,
        cashFlow: deal.passiveIncome,
        type: 'big_deal',
        description: deal.description,
        isRealEstate: deal.isRealEstate || false,
        apartments: deal.apartments
      };

      await this.databaseService.addAsset(gameId, userId, asset);
    }

    return { success: true };
  }

  /**
   * Покупает сделку с оплатой кредиткой
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {Object} deal - Объект сделки
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async buyDealWithCreditCard(gameId, userId, deal) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, error: 'player_not_found' };
    }

    // Специальная логика для big deals с mortgage: создаем ипотеку + кредит на down payment
    if (deal.type === 'big' && deal.mortgage !== undefined) {
      // Рассчитываем платежи
      const monthlyMortgagePayment = Math.floor(deal.cost * (0.01 + game.creditMultiple)); // 0.01% от стоимости
      const monthlyCreditPayment = Math.floor(deal.downPayment * (0.02 + game.creditMultiple)); // 2% от первоначального взноса

      // Генерируем уникальный ID для связи актив-кредит
      const assetLiabilityId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

      // Добавляем ипотеку
      const mortgageLiability = {
        title: deal.title,
        cost: deal.cost,
        downPayment: deal.downPayment,
        loanAmount: deal.mortgage,
        monthlyPayment: monthlyMortgagePayment,
        type: 'big_deal_loan',
        assetLiabilityId: assetLiabilityId
      };

      await this.databaseService.addLiability(gameId, userId, mortgageLiability);

      // Добавляем кредит на первоначальный взнос
      const creditLiability = {
        title: `Кредитная карта - Первоначальный взнос за ${deal.title}`,
        cost: deal.downPayment,
        loanAmount: deal.downPayment,
        monthlyPayment: monthlyCreditPayment,
        type: 'credit_card_loan'
      };

      await this.databaseService.addLiability(gameId, userId, creditLiability);

      // Добавляем актив
      const asset = {
        assetId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        id: deal.id,
        title: deal.title,
        cost: deal.cost,
        cashFlow: deal.passiveIncome,
        type: 'big_deal',
        description: deal.description,
        isRealEstate: deal.isRealEstate || false,
        apartments: deal.apartments,
        assetLiabilityId: assetLiabilityId
      };

      await this.databaseService.addAsset(gameId, userId, asset);

      return { success: true };
    }

    // Стандартная логика для других сделок
    // Рассчитываем ежемесячный платеж по кредитке (2% от стоимости)
    const monthlyPayment = Math.floor(deal.cost * (0.02 + game.creditMultiple));

    // Для expenses-сделок не добавляем актив, только кредит
    if (!deal.expenses) {
      // Добавляем актив
      const asset = {
        assetId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        id: deal.id,
        title: deal.title,
        cost: deal.cost,
        cashFlow: deal.passiveIncome || deal.cashFlow,
        type: deal.type === 'big' ? 'big_deal_credit_card' : 'small_deal_credit_card',
        description: deal.description,
        isRealEstate: deal.isRealEstate || false
      };

      await this.databaseService.addAsset(gameId, userId, asset);
    }

    // Добавляем кредитку как liability
    const liability = {
      title: `Кредитная карта - ${deal.title}`,
      cost: deal.cost,
      loanAmount: deal.cost,
      monthlyPayment: monthlyPayment,
      type: 'credit_card_loan'
    };

    await this.databaseService.addLiability(gameId, userId, liability);

    return { success: true };
  }

  /**
   * Обрабатывает multiple сделку (изменение количества акций у всех игроков)
   * @param {string} gameId - ID игры
   * @param {Object} deal - Объект сделки с multiple
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async processMultiple(gameId, deal) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    if (!deal.multiple || !deal.group_Id) {
      return { success: false, error: 'invalid_deal' };
    }

    const multiplier = deal.multiple; // 2 или -2

    // Проходим по всем игрокам
    for (const player of game.players) {
      if (player.assets && player.assets.length > 0) {
        // Находим активы с тем же group_id
        const updatedAssets = player.assets.map(asset => {
          if (asset.group_Id === deal.group_Id && asset.quantity) {
            // Изменяем количество
            let newQuantity;
            if (multiplier === 2) {
              newQuantity = asset.quantity * 2;
            } else if (multiplier === -2) {
              newQuantity = Math.ceil(asset.quantity / 2);
            }

            // Изменяем cashFlow пропорционально количеству
            const newCashFlow = Math.floor((asset.cashFlow / asset.quantity) * newQuantity);

            return {
              ...asset,
              quantity: newQuantity,
              cashFlow: newCashFlow
            };
          }
          return asset;
        });

        // Обновляем активы игрока
        const playerIndex = game.players.indexOf(player);
        const newPassiveIncome = updatedAssets.reduce((sum, asset) => sum + asset.cashFlow, 0);
        const newCashFlow = player.salary + newPassiveIncome - player.totalExpenses;

        await this.databaseService.getDb().collection('games').updateOne(
          { gameId },
          {
            $set: {
              [`players.${playerIndex}.assets`]: updatedAssets,
              [`players.${playerIndex}.passiveIncome`]: newPassiveIncome,
              [`players.${playerIndex}.totalIncome`]: player.salary + newPassiveIncome,
              [`players.${playerIndex}.cashFlow`]: newCashFlow
            }
          }
        );
      }
    }

    return { success: true };
  }

  /**
   * Продает акции по цене сделки
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {Object} deal - Объект сделки
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async sellStocks(gameId, userId, deal) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, error: 'player_not_found' };
    }

    if (!deal.canSellStocks || !deal.group_Id) {
      return { success: false, error: 'invalid_deal' };
    }

    let totalIncome = 0;
    let totalQuantity = 0;
    let soldCashFlow = 0;
    const updatedAssets = [];
    const closedLoans = [];

    // Проходим по активам игрока
    for (const asset of player.assets) {
      if (asset.group_Id === deal.group_Id) {
        // Продаем этот актив
        const quantity = asset.quantity || 1;
        const income = deal.cost * quantity;
        totalIncome += income;
        totalQuantity += quantity;

        // Вычитаем пассивный доход актива, если он есть
        if (asset.cashFlow > 0) {
          soldCashFlow += asset.cashFlow;
        }

        // Закрываем связанные кредиты
        if (player.liabilities) {
          for (const liability of player.liabilities) {
            if (liability.title.includes(asset.title) && liability.loanAmount > 0) {
              closedLoans.push(liability);
            }
          }
        }
      } else {
        // Оставляем актив
        updatedAssets.push(asset);
      }
    }

    if (totalQuantity === 0) {
      return { success: false, error: 'no_assets_to_sell' };
    }

    // Вычитаем стоимость закрытых кредитов из дохода
    let netIncome = totalIncome;
    for (const loan of closedLoans) {
      netIncome -= loan.loanAmount;
    }

    // Обновляем баланс игрока
    const newCash = player.cash + netIncome;

    // Удаляем закрытые кредиты
    const updatedLiabilities = player.liabilities.filter(liability =>
      !closedLoans.some(closed => closed.title === liability.title)
    );

    const newLoansCount = updatedLiabilities.length;
    const newTotalLoans = updatedLiabilities.reduce((sum, liab) => sum + (liab.loanAmount || 0), 0);
    const newTotalLoanPayments = updatedLiabilities.reduce((sum, liab) => sum + (liab.monthlyPayment || 0), 0);
    const newTotalExpenses = player.expenses + player.childrenExpenses + newTotalLoanPayments;
    const newPassiveIncome = player.passiveIncome - soldCashFlow;
    const newCashFlow = player.salary + newPassiveIncome - newTotalExpenses;

    const playerIndex = game.players.indexOf(player);
    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      {
        $set: {
          [`players.${playerIndex}.cash`]: newCash,
          [`players.${playerIndex}.assets`]: updatedAssets,
          [`players.${playerIndex}.assetsCount`]: updatedAssets.length,
          [`players.${playerIndex}.passiveIncome`]: newPassiveIncome,
          [`players.${playerIndex}.totalIncome`]: player.salary + newPassiveIncome,
          [`players.${playerIndex}.liabilities`]: updatedLiabilities,
          [`players.${playerIndex}.loansCount`]: newLoansCount,
          [`players.${playerIndex}.totalLoans`]: newTotalLoans,
          [`players.${playerIndex}.totalLoanPayments`]: newTotalLoanPayments,
          [`players.${playerIndex}.totalExpenses`]: newTotalExpenses,
          [`players.${playerIndex}.cashFlow`]: newCashFlow
        }
      }
    );

    return { success: true };
  }

  /**
   * Оплачивает расходы по сделке
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {Object} deal - Объект сделки с expenses
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async payExpenses(gameId, userId, deal) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, error: 'player_not_found' };
    }

    if (!deal.expenses) {
      return { success: false, error: 'invalid_deal' };
    }

    // Проверяем хватает ли денег
    if (player.cash < deal.expenses) {
      return { success: false, error: 'insufficient_funds' };
    }

    // Списываем расходы
    const newCash = player.cash - deal.expenses;

    // Обновляем баланс
    const playerIndex = game.players.indexOf(player);
    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      { $set: { [`players.${playerIndex}.cash`]: newCash } }
    );

    return { success: true };
  }

  /**
   * Оплачивает miscellaneous расходы
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {Object} miscCard - Объект miscellaneous карточки
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async payMiscellaneousExpenses(gameId, userId, miscCard) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, error: 'player_not_found' };
    }

    if (!miscCard.cost) {
      return { success: false, error: 'invalid_misc_card' };
    }

    // Проверяем хватает ли денег
    if (player.cash < miscCard.cost) {
      return { success: false, error: 'insufficient_funds' };
    }

    // Списываем расходы
    const newCash = player.cash - miscCard.cost;

    // Обновляем баланс
    const playerIndex = game.players.indexOf(player);
    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      { $set: { [`players.${playerIndex}.cash`]: newCash } }
    );

    return { success: true };
  }

  /**
   * Покупает miscellaneous с ипотекой
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {Object} miscCard - Объект miscellaneous карточки
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async buyMiscellaneousWithMortgage(gameId, userId, miscCard) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, error: 'player_not_found' };
    }

    if (!miscCard.mortgage || !miscCard.downPayment) {
      return { success: false, error: 'invalid_misc_card' };
    }

    // Проверяем хватает ли денег на первоначальный взнос
    if (player.cash < miscCard.downPayment) {
      return { success: false, error: 'insufficient_funds' };
    }

    // Рассчитываем ежемесячный платеж по ипотеке (0.01% от стоимости)
    const monthlyPayment = Math.floor(miscCard.cost * 0.01);

    // Списываем первоначальный взнос
    const newCash = player.cash - miscCard.downPayment;

    // Обновляем баланс
    const playerIndex = game.players.indexOf(player);
    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      { $set: { [`players.${playerIndex}.cash`]: newCash } }
    );

    // Добавляем ипотеку
    const liability = {
      title: miscCard.description,
      cost: miscCard.cost,
      downPayment: miscCard.downPayment,
      loanAmount: miscCard.mortgage,
      monthlyPayment: monthlyPayment,
      type: 'miscellaneous_mortgage'
    };

    await this.databaseService.addLiability(gameId, userId, liability);

    return { success: true };
  }

  /**
   * Покупает miscellaneous с кредитом
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {Object} miscCard - Объект miscellaneous карточки
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async buyMiscellaneousWithCredit(gameId, userId, miscCard) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, error: 'player_not_found' };
    }

    if (!miscCard.credit) {
      return { success: false, error: 'invalid_misc_card' };
    }

    // Рассчитываем ежемесячный платеж по кредиту (2% от стоимости)
    const monthlyPayment = Math.floor(miscCard.cost * 0.01);

    // Добавляем кредит
    const liability = {
      title: miscCard.description,
      cost: miscCard.cost,
      downPayment: 0,
      loanAmount: miscCard.cost,
      monthlyPayment: monthlyPayment,
      type: 'miscellaneous_credit_loan'
    };

    await this.databaseService.addLiability(gameId, userId, liability);

    return { success: true };
  }

  /**
   * Оплачивает miscellaneous кредиткой
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {Object} miscCard - Объект miscellaneous карточки
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async payMiscellaneousWithCreditCard(gameId, userId, miscCard) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, error: 'player_not_found' };
    }

    // Рассчитываем ежемесячный платеж по кредитке (2% от стоимости)
    const monthlyPayment = Math.floor(miscCard.cost * (0.02 + game.creditMultiple));

    // Добавляем кредитку как liability (без добавления актива)
    const liability = {
      title: `Кредитная карта - ${miscCard.description}`,
      cost: miscCard.cost,
      loanAmount: miscCard.cost,
      monthlyPayment: monthlyPayment,
      type: 'credit_card_loan'
    };

    await this.databaseService.addLiability(gameId, userId, liability);

    return { success: true };
  }

  /**
   * Устанавливает флаг броска кубика для текущего хода
   * @param {string} gameId - ID игры
   * @param {boolean} rolled - Был ли брошен кубик
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setDiceRolledThisTurn(gameId, rolled) {
    return await this.databaseService.setDiceRolledThisTurn(gameId, rolled);
  }

  /**
   * Передает комиссию предлагающему игроку
   * @param {string} gameId - ID игры
   * @param {string} userId - ID предлагающего игрока
   * @param {number} commissionAmount - Сумма комиссии
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async transferCommission(gameId, offeringUserId, commissionAmount) {
    return await this.databaseService.updatePlayerCash(gameId, offeringUserId, commissionAmount);
  }

  /**
   * Продает актив за половину стоимости в банкротстве
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {string} assetId - ID актива для продажи
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async sellAssetWithBankruptcy(gameId, userId, assetId) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const player = game.players[playerIndex];
    if (!player.bankruptcyState) {
      return { success: false, error: 'not_in_bankruptcy' };
    }

    // Найти актив по assetId
    const asset = player.assets.find(a => a.assetId === assetId);
    if (!asset) {
      return { success: false, error: 'asset_not_found' };
    }
    const quantity = asset.quantity || 1;
    const sellPrice = Math.floor((asset.cost * quantity) / 2); // Продажа за половину стоимости
    const cashFlowReduction = asset.cashFlow || 0;

    // Находим связанные кредиты для закрытия
    const closedLoans = [];
    if (player.liabilities && asset.assetLiabilityId) {
      for (const liability of player.liabilities) {
        if (liability.assetLiabilityId === asset.assetLiabilityId) {
          closedLoans.push(liability);
        }
      }
    }

    // Удаляем актив из массива
    const updatedAssets = player.assets.filter(a => a.assetId !== assetId);

    // Вычитаем стоимость закрытых кредитов из дохода от продажи
    let netIncome = sellPrice;
    for (const loan of closedLoans) {
      netIncome -= loan.loanAmount;
    }

    // Удаляем закрытые кредиты
    const updatedLiabilities = player.liabilities ? player.liabilities.filter(liability =>
      !closedLoans.some(closed => closed.assetLiabilityId === liability.assetLiabilityId)
    ) : [];

    // Рассчитываем новые финансовые показатели
    const newTotalLoanPayments = updatedLiabilities.reduce((sum, liab) => sum + (liab.monthlyPayment || 0), 0);
    const newTotalLoans = updatedLiabilities.reduce((sum, liab) => sum + (liab.loanAmount || 0), 0);
    const newTotalExpenses = player.expenses + player.childrenExpenses + newTotalLoanPayments;
    const newPassiveIncome = player.passiveIncome - cashFlowReduction;
    const newCashFlow = player.salary + newPassiveIncome - newTotalExpenses;
    const newCash = netIncome > 0 ? player.cash + netIncome : player.cash;

    // Обновляем данные игрока
    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      {
        $set: {
          [`players.${playerIndex}.assets`]: updatedAssets,
          [`players.${playerIndex}.assetsCount`]: updatedAssets.length,
          [`players.${playerIndex}.passiveIncome`]: newPassiveIncome,
          [`players.${playerIndex}.totalIncome`]: player.salary + newPassiveIncome,
          [`players.${playerIndex}.liabilities`]: updatedLiabilities,
          [`players.${playerIndex}.loansCount`]: updatedLiabilities.length,
          [`players.${playerIndex}.totalLoans`]: newTotalLoans,
          [`players.${playerIndex}.totalLoanPayments`]: newTotalLoanPayments,
          [`players.${playerIndex}.totalExpenses`]: newTotalExpenses,
          [`players.${playerIndex}.cashFlow`]: newCashFlow,
          [`players.${playerIndex}.cash`]: newCash
        }
      }
    );

    return { success: true };
  }

  /**
   * Оплачивает долг в банкротстве
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {number} liabilityIndex - Индекс долга в массиве
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async payLiability(gameId, userId, liabilityIndex) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const player = game.players[playerIndex];

    if (!player.liabilities || liabilityIndex >= player.liabilities.length) {
      return { success: false, error: 'liability_not_found' };
    }

    const liability = player.liabilities[liabilityIndex];
    // Всегда списываем полную сумму кредита
    const paymentAmount = liability.loanAmount;

    // Проверяем хватает ли денег
    if (player.cash < paymentAmount) {
      return { success: false, error: 'insufficient_funds' };
    }

    // Удаляем долг из массива
    const updatedLiabilities = player.liabilities.filter((_, index) => index !== liabilityIndex);

    // Рассчитываем новые финансовые показатели
    const newTotalLoanPayments = updatedLiabilities.reduce((sum, liab) => sum + (liab.monthlyPayment || 0), 0);
    const newTotalLoans = updatedLiabilities.reduce((sum, liab) => sum + (liab.loanAmount || 0), 0);
    const newTotalExpenses = player.expenses + player.childrenExpenses + newTotalLoanPayments;
    const newCashFlow = player.salary + player.passiveIncome - newTotalExpenses;
    const newCash = player.cash - paymentAmount;

    // Обновляем данные игрока
    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      {
        $set: {
          [`players.${playerIndex}.liabilities`]: updatedLiabilities,
          [`players.${playerIndex}.loansCount`]: updatedLiabilities.length,
          [`players.${playerIndex}.totalLoans`]: newTotalLoans,
          [`players.${playerIndex}.totalLoanPayments`]: newTotalLoanPayments,
          [`players.${playerIndex}.totalExpenses`]: newTotalExpenses,
          [`players.${playerIndex}.cashFlow`]: newCashFlow,
          [`players.${playerIndex}.cash`]: newCash
        }
      }
    );

    return { success: true };
  }

  /**
   * Проверяет, разрешена ли банкротство (cashFlow >= 0)
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @returns {Promise<{success: boolean, error?: string, resolved?: boolean}>} Результат операции
   */
  async checkBankruptcyResolution(gameId, userId) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, error: 'player_not_found' };
    }

    if (!player.bankruptcyState) {
      return { success: false, error: 'not_in_bankruptcy' };
    }

    const resolved = player.cashFlow >= 0;
    return { success: true, resolved };
  }

  /**
   * Проверяет и выполняет переход игрока на Fast Track
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @returns {Promise<{success: boolean, error?: string, transitioned?: boolean}>} Результат операции
   */
  async checkAndTransitionToFastTrack(gameId, userId) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const player = game.players[playerIndex];

    // Проверяем условие перехода: не на Fast Track и passiveIncome > totalExpenses
    if (!player.inFastTrack && player.passiveIncome > player.totalExpenses) {
      // Выполняем полное преобразование игрока для Fast Track

      // 1. Увеличиваем пассивный доход в 100 раз
      const newPassiveIncome = player.passiveIncome * 100;

      // 2. Устанавливаем Fast Track значения
      const fastTrackIncome = newPassiveIncome;
      const dreamCost = newPassiveIncome + 1500000;
      const fastTrackCash = player.cash + newPassiveIncome;

      // 3. Обнуляем расходы и очищаем активы/кредиты
      const updateData = {
        [`players.${playerIndex}.inFastTrack`]: true,
        [`players.${playerIndex}.position`]: 0,
        [`players.${playerIndex}.fastTrackIncome`]: fastTrackIncome,
        [`players.${playerIndex}.fastTrackCash`]: fastTrackCash,
        [`players.${playerIndex}.dreamCost`]: dreamCost,
        // Обнуляем расходы
        [`players.${playerIndex}.expenses`]: 0,
        [`players.${playerIndex}.childrenExpenses`]: 0,
        [`players.${playerIndex}.totalExpenses`]: 0,
        [`players.${playerIndex}.totalLoanPayments`]: 0,
        // Очищаем активы и кредиты
        [`players.${playerIndex}.assets`]: [],
        [`players.${playerIndex}.assetsCount`]: 0,
        [`players.${playerIndex}.liabilities`]: [],
        [`players.${playerIndex}.loansCount`]: 0,
        [`players.${playerIndex}.totalLoans`]: 0,
        // Пересчитываем денежный поток
        [`players.${playerIndex}.cashFlow`]: newPassiveIncome
      };

      await this.databaseService.getDb().collection('games').updateOne(
        { gameId },
        { $set: updateData }
      );

      return { success: true, transitioned: true };
    }

    return { success: true, transitioned: false };
  }

  /**
   * Добавляет пассив игроку
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {Object} liability - Объект пассива (title, cost, loanAmount, monthlyPayment, type)
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async addLiability(gameId, userId, liability) {
    return await this.databaseService.addLiability(gameId, userId, liability);
  }

  /**
   * Завершает банкротство
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {boolean} isLoss - true если проигрыш, false если выход из банкротства
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async endBankruptcy(gameId, userId, isLoss) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const player = game.players[playerIndex];
    if (!player.bankruptcyState) {
      return { success: false, error: 'not_in_bankruptcy' };
    }

    const updateData = {
      [`players.${playerIndex}.bankruptcyState`]: false
    };

    if (isLoss) {
      // Проигрыш - удаляем игрока из игры
      const updatedPlayers = game.players.filter(p => p.userId !== userId);
      await this.databaseService.getDb().collection('games').updateOne(
        { gameId },
        {
          $set: {
            players: updatedPlayers,
            currentPlayerIndex: game.currentPlayerIndex % updatedPlayers.length
          }
        }
      );

      // Проверяем, остались ли игроки в игре
      if (updatedPlayers.length === 0) {
        await this.finishGame(gameId);
      }

      // Обновляем статистику проигрыша
      await this.userStatsService.updateUserStats(userId, { losses: (await this.userStatsService.getUserStats(userId)).losses + 1 });

      return { success: true };
    } else {
      // Выход из банкротства - устанавливаем пропуск ходов через новый массив
      await this.databaseService.addSkippedTurn(gameId, userId, player.username, 3, 'bankruptcy');

      await this.databaseService.getDb().collection('games').updateOne(
        { gameId },
        { $set: updateData }
      );

      return { success: true };
    }
  }

  /**
   * Оплачивает fastTrack расходы
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {number} amount - Сумма расходов
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async payFastTrackExpense(gameId, userId, amount) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const player = game.players[playerIndex];

    // Для Fast Track используем fastTrackCash вместо cash
    const currentBalance = player.fastTrackCash || 0;

    // Проверяем хватает ли денег
    if (currentBalance < amount) {
      return { success: false, error: 'insufficient_funds' };
    }

    // Списываем расходы
    const newBalance = currentBalance - amount;

    // Обновляем баланс fastTrackCash
    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      { $set: { [`players.${playerIndex}.fastTrackCash`]: newBalance } }
    );

    return { success: true };
  }

  /**
   * Покупает fastTrack актив
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {Object} fastTrackEvent - Объект fastTrack события
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async buyFastTrackAsset(gameId, userId, fastTrackEvent) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const player = game.players[playerIndex];

    // Проверяем хватает ли денег
    if (player.cash < fastTrackEvent.cost) {
      return { success: false, error: 'insufficient_funds' };
    }

    // Списываем стоимость
    const newCash = player.cash - fastTrackEvent.cost;

    // Обновляем баланс
    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      { $set: { [`players.${playerIndex}.cash`]: newCash } }
    );

    // Добавляем актив
    const asset = {
      assetId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      id: `fastTrack_${Date.now()}`,
      title: fastTrackEvent.title,
      cost: fastTrackEvent.cost,
      cashFlow: fastTrackEvent.passiveIncome || 0,
      type: 'fast_track_asset',
      description: fastTrackEvent.description
    };

    await this.databaseService.addAsset(gameId, userId, asset);

    return { success: true };
  }

  /**
   * Добавляет наличные игроку
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {number} amount - Сумма наличных
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async addFastTrackCash(gameId, userId, amount) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const player = game.players[playerIndex];

    // Для игроков на Fast Track обновляем fastTrackCash, иначе cash
    if (player.inFastTrack) {
      const newCash = (player.fastTrackCash || 0) + amount;
      await this.databaseService.getDb().collection('games').updateOne(
        { gameId },
        { $set: { [`players.${playerIndex}.fastTrackCash`]: newCash } }
      );
    } else {
      const newCash = player.cash + amount;
      await this.databaseService.getDb().collection('games').updateOne(
        { gameId },
        { $set: { [`players.${playerIndex}.cash`]: newCash } }
      );
    }

    return { success: true };
  }

  /**
   * Добавляет пассивный доход игроку
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {number} amount - Сумма пассивного дохода
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async addFastTrackPassiveIncome(gameId, userId, amount) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const player = game.players[playerIndex];

    if (player.inFastTrack) {
      // Для Fast Track игроков увеличиваем fastTrackIncome
      const newFastTrackIncome = player.fastTrackIncome + amount;
      await this.databaseService.getDb().collection('games').updateOne(
        { gameId },
        {
          $set: {
            [`players.${playerIndex}.fastTrackIncome`]: newFastTrackIncome,
            [`players.${playerIndex}.cashFlow`]: newFastTrackIncome
          }
        }
      );
    } else {
      const newPassiveIncome = player.passiveIncome + amount;
      const newCashFlow = player.salary + newPassiveIncome - player.totalExpenses;
      await this.databaseService.getDb().collection('games').updateOne(
        { gameId },
        {
          $set: {
            [`players.${playerIndex}.passiveIncome`]: newPassiveIncome,
            [`players.${playerIndex}.cashFlow`]: newCashFlow
          }
        }
      );
    }

    return { success: true };
  }

  /**
   * Активирует эффект благотворительности
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async activateCharity(gameId, userId) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const player = game.players[playerIndex];

    // Устанавливаем эффект благотворительности
    const updateData = {
      [`players.${playerIndex}.charityEffect`]: true
    };

    // Устанавливаем лимит ходов в зависимости от режима
    if (player.inFastTrack) {
      // Для Fast Track эффект постоянный
      updateData[`players.${playerIndex}.charityTurnsLeft`] = -1;
    } else {
      // Для Rat Race лимит 3 хода
      updateData[`players.${playerIndex}.charityTurnsLeft`] = 3;
    }

    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      { $set: updateData }
    );

    return { success: true };
  }

  /**
   * Устанавливает текущее fastTrack событие
   * @param {string} gameId - ID игры
   * @param {Object} fastTrackEvent - Объект fastTrack события
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setCurrentFastTrack(gameId, fastTrackEvent) {
    return await this.databaseService.setCurrentFastTrack(gameId, fastTrackEvent);
  }

  /**
   * Проверяет, занято ли поле fastTrack другим игроком
   * @param {string} gameId - ID игры
   * @param {string} userId - ID текущего игрока
   * @param {Object} fastTrackEvent - Объект fastTrack события
   * @returns {Promise<{success: boolean, occupied?: boolean, error?: string}>} Результат операции
   */
  async isFastTrackFieldOccupied(gameId, userId, fastTrackEvent) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    // Проверить, есть ли это поле в активах у других игроков
    for (const player of game.players) {
      if (player.userId !== userId && player.assets) {
        const hasField = player.assets.some(asset =>
          asset.title === fastTrackEvent.title && asset.type === 'fast_track_asset'
        );
        if (hasField) {
          return { success: true, occupied: true };
        }
      }
    }

    return { success: true, occupied: false };
  }

  /**
   * Обрабатывает инвестирование в fastTrack поле
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {Object} fastTrackEvent - Объект fastTrack события
   * @returns {Promise<{success: boolean, error?: string, diceResult?: number, reward?: Object}>} Результат операции
   */
  async investInFastTrackField(gameId, userId, fastTrackEvent) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const player = game.players[playerIndex];

    // Для Fast Track игроков используем fastTrackCash, иначе cash
    const currentBalance = player.inFastTrack ? (player.fastTrackCash || 0) : player.cash;
    const eventData = fastTrackEvent.data || fastTrackEvent;

    // Проверить хватает ли денег
    if (currentBalance < eventData.cost) {
      return { success: false, error: 'insufficient_funds' };
    }

    // Списать стоимость
    const newBalance = currentBalance - eventData.cost;

    let diceResult = null;
    let reward = null;
    let addAsset = false;

    if (eventData.dice) {
      // Бросить кубик
      diceResult = this.rollDice(1);

      if (diceResult >= eventData.dice) {
        // Успех - применить награду и добавить актив
        if (eventData.cash) {
          reward = { type: 'cash', amount: eventData.cash };
        } else if (eventData.passiveIncome) {
          reward = { type: 'passiveIncome', amount: eventData.passiveIncome };
        }
        addAsset = true;
      }
      // Если неудача - ничего не получаем, актив не добавляется
    } else {
      // Без кубика - всегда получаем passiveIncome и актив
      reward = { type: 'passiveIncome', amount: eventData.passiveIncome };
      addAsset = true;
    }

    // Применить награду
    let updatedBalance = newBalance;
    let newPassiveIncome = player.passiveIncome;
    let newFastTrackIncome = player.fastTrackIncome || 0;

    if (reward) {
      if (reward.type === 'cash') {
        updatedBalance += reward.amount;
      } else if (reward.type === 'passiveIncome') {
        if (player.inFastTrack) {
          // Для Fast Track игроков увеличиваем fastTrackIncome
          newFastTrackIncome += reward.amount;
        } else {
          newPassiveIncome += reward.amount;
        }
      }
    }

    // Добавить актив только если нужно
    if (addAsset) {
      const asset = {
        assetId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        id: `fastTrack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: fastTrackEvent.title,
        cost: eventData.cost,
        cashFlow: eventData.passiveIncome || 0,
        type: 'fast_track_asset',
        description: fastTrackEvent.description
      };

      await this.databaseService.addAsset(gameId, userId, asset);
    }

    // Обновить данные игрока
    const updateData = {};

    if (player.inFastTrack) {
      updateData[`players.${playerIndex}.fastTrackCash`] = updatedBalance;
      updateData[`players.${playerIndex}.fastTrackIncome`] = newFastTrackIncome;
      updateData[`players.${playerIndex}.cashFlow`] = newFastTrackIncome;
    } else {
      const newCashFlow = player.salary + newPassiveIncome - player.totalExpenses;
      updateData[`players.${playerIndex}.passiveIncome`] = newPassiveIncome;
      updateData[`players.${playerIndex}.cashFlow`] = newCashFlow;
      updateData[`players.${playerIndex}.cash`] = updatedBalance;
    }

    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      { $set: updateData }
    );

    return {
      success: true,
      diceResult,
      reward
    };
  }

  /**
   * Обрабатывает покупку мечты игроком
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {Object} dreamField - Объект поля мечты
   * @param {Array} allPlayers - Массив всех игроков
   * @returns {Promise<{success: boolean, error?: string, victory?: boolean, cost?: number}>} Результат операции
   */
  async buyDream(gameId, userId, dreamField, allPlayers) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const player = game.players[playerIndex];

    // Определяем тип мечты
    const isOwnDream = player.dream && player.dream.id === dreamField.id;
    const otherPlayerWithDream = allPlayers.find(p => p.dream && p.dream.id === dreamField.id && p.userId !== userId);
    const isOtherDream = !!otherPlayerWithDream;
    const isUnclaimedDream = !isOwnDream && !isOtherDream;

    let cost = dreamField.data.cost;
    let victory = false;

    if (isOwnDream) {
      // Своя мечта - победа
      victory = true;
    } else if (isOtherDream) {
      // Мечта другого игрока - удвоенная стоимость
      cost = dreamField.data.cost * 2;
    } else {
      // Ничья мечта - обычная стоимость, ничего не происходит
      cost = dreamField.data.cost;
    }

    // Проверяем хватает ли денег
    if ((player.fastTrackCash || 0) < cost) {
      return { success: false, error: 'insufficient_funds' };
    }

    // Списываем стоимость
    const newCash = (player.fastTrackCash || 0) - cost;

    // Обновляем баланс
    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      { $set: { [`players.${playerIndex}.fastTrackCash`]: newCash } }
    );

    return {
      success: true,
      victory,
      cost
    };
  }

  /**
   * Проверяет автоматическую победу на Fast Track
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @returns {Promise<{success: boolean, victory?: boolean, reason?: string, error?: string}>} Результат операции
   */
  async checkFastTrackVictory(gameId, userId) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, error: 'player_not_found' };
    }

    // Проверяем только для игроков на Fast Track с выбранной мечтой
    if (!player.inFastTrack || !player.dreamCost) {
      return { success: true, victory: false };
    }

    // Проверяем условие победы: fastTrackIncome >= dreamCost
    if (player.fastTrackIncome >= player.dreamCost) {
      return {
        success: true,
        victory: true,
        reason: 'automatic_fast_track_victory'
      };
    }

    return { success: true, victory: false };
  }

  /**
   * Сохраняет ID сообщения выбора мечты для игрока
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {number} messageId - ID сообщения
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async saveDreamMessageId(gameId, userId, messageId) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    // Сохраняем ID сообщения выбора мечты для игрока
    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      { $set: { [`players.${playerIndex}.dreamMessageId`]: messageId } }
    );

    return { success: true };
  }

  /**
   * Обрабатывает победу игрока (выход из игры)
   * @param {string} gameId - ID игры
   * @param {string} winnerUserId - ID победившего игрока
   * @param {string} victoryReason - Причина победы ('dream_purchase' или 'automatic_fast_track_victory')
   * @returns {Promise<{success: boolean, error?: string, gameFinished?: boolean}>} Результат операции
   */
  async finishGameWithVictory(gameId, winnerUserId) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    // Удаляем победившего игрока из игры
    const updatedPlayers = game.players.filter(p => p.userId !== winnerUserId);

    // Обновляем статистику победителя
    await this.userStatsService.updateUserStats(winnerUserId, { wins: (await this.userStatsService.getUserStats(winnerUserId)).wins + 1 });

    // Проверяем, остались ли игроки в игре
    if (updatedPlayers.length === 0) {
      // Все игроки победили - завершаем игру
      await this.databaseService.getDb().collection('games').updateOne(
        { gameId },
        {
          $set: {
            status: 'finished',
            winner: winnerUserId,
            finishedAt: new Date(),
            players: updatedPlayers
          }
        }
      );

      await this.messageService.sendGameFinishedMessage(game.chatId);
      return { success: true, gameFinished: true };
    } else {
      // Есть еще игроки - продолжаем игру, удаляя победившего
      // Рассчитываем индекс следующего игрока после удаленного
      const winnerIndex = game.players.findIndex(p => p.userId === winnerUserId);
      let newCurrentIndex;
      
      if (winnerIndex === game.currentPlayerIndex) {
        // Если победил текущий игрок, передаем ход следующему
        newCurrentIndex = game.currentPlayerIndex % updatedPlayers.length;
      } else if (winnerIndex < game.currentPlayerIndex) {
        // Если победил предыдущий игрок, сдвигаем индекс на 1 назад
        newCurrentIndex = (game.currentPlayerIndex - 1) % updatedPlayers.length;
      } else {
        // Если победил следующий игрок, индекс остается прежним
        newCurrentIndex = game.currentPlayerIndex % updatedPlayers.length;
      }

      await this.databaseService.getDb().collection('games').updateOne(
        { gameId },
        {
          $set: {
            players: updatedPlayers,
            currentPlayerIndex: newCurrentIndex,
            diceRolledThisTurn: false // Сбрасываем флаг броска кубика для нового игрока
          }
        }
      );

      // Автоматически передаем ход следующему игроку
      const nextPlayer = updatedPlayers[newCurrentIndex];
      if (nextPlayer) {
        // Проверяем, нужно ли перейти на Fast Track для нового игрока
        const { transitioned } = await this.checkAndTransitionToFastTrack(gameId, nextPlayer.userId);

        // Если произошел переход на Fast Track, заново получаем данные игрока
        let finalNextPlayer = nextPlayer;
        if (transitioned) {
          const updatedGame = await this.databaseService.getGame(gameId);
          finalNextPlayer = updatedGame.players[newCurrentIndex];
        }

        // Проверяем автоматическую победу для нового игрока
        const victoryCheck = await this.checkFastTrackVictory(gameId, finalNextPlayer.userId);
        if (victoryCheck.success && victoryCheck.victory) {
          // Новый игрок также победил автоматически - завершаем игру
          await this.finishGameWithVictory(gameId, finalNextPlayer.userId, victoryCheck.reason);
          
          // Отправляем сообщение о победе
          await this.messageService.sendErrorMessage(
            game.chatId,
            `🎉 ${finalNextPlayer.username} достиг своей цели и победил на быстром круге!`
          );

          return { success: true, gameFinished: true };
        }
      }

      return { success: true, gameFinished: false };
    }
  }
}

module.exports = GameService;
