class GameService {
  constructor(databaseService, userStatsService) {
    this.databaseService = databaseService;
    this.userStatsService = userStatsService;
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

      if (field.type === FIELD_TYPES.PAYDAY) {
        // Обрабатываем PAYDAY
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
    const nextTurnResult = await this.databaseService.nextTurn(gameId);
    if (!nextTurnResult.success) {
      return nextTurnResult;
    }

    const game = await this.databaseService.getGame(gameId);
    const nextPlayer = game.players[nextTurnResult.nextPlayerIndex];

    return {
      success: true,
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
    return await this.databaseService.decreaseCharityTurns(gameId, userId);
  }

  /**
   * Обрабатывает событие поля "День выплат" - начисляет месячный денежный поток
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @returns {Promise<{success: boolean, error?: string, cashFlow?: number, newCash?: number}>} Результат операции
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

    // Обновляем данные игрока
    const updateData = {
      [`players.${playerIndex}.cash`]: newCash,
      [`players.${playerIndex}.cashFlow`]: cashFlow
    };

    await this.databaseService.getDb().collection('games').updateOne(
      { gameId },
      { $set: updateData }
    );

    return {
      success: true,
      cashFlow,
      newCash
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
      title: deal.title,
      cost: deal.cost,
      cashFlow: totalIncome,
      type: 'small_deal',
      description: deal.description,
      quantity: quantity,
      group_Id: deal.group_Id,
      isRealEstate: deal.isRealEstate
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
        return { success: false, error: 'insufficient_funds' };
      }

      // Рассчитываем ежемесячный платеж по кредиту (0.01% от стоимости)
      const monthlyPayment = Math.floor(deal.cost * 0.0001); // 0.01%
      const loanAmount = deal.mortgage;

      // Списываем первоначальный взнос
      const newCash = player.cash - deal.downPayment;

      // Обновляем баланс
      await this.databaseService.getDb().collection('games').updateOne(
        { gameId },
        { $set: { [`players.${game.players.indexOf(player)}.cash`]: newCash } }
      );

      // Добавляем актив
      const asset = {
        title: deal.title,
        cost: deal.cost,
        cashFlow: deal.passiveIncome,
        type: 'big_deal',
        description: deal.description,
        isRealEstate: deal.isRealEstate,
        apartments: deal.apartments
      };

      await this.databaseService.addAsset(gameId, userId, asset);

      // Добавляем кредит
      const liability = {
        title: deal.title,
        cost: deal.cost,
        downPayment: deal.downPayment,
        loanAmount: loanAmount,
        monthlyPayment: monthlyPayment,
        type: 'big_deal_loan'
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
        title: deal.title,
        cost: deal.cost,
        cashFlow: deal.passiveIncome,
        type: 'big_deal',
        description: deal.description,
        isRealEstate: deal.isRealEstate,
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

    // Рассчитываем ежемесячный платеж по кредитке (2% от стоимости)
    const monthlyPayment = Math.floor(deal.cost * 0.02);

    // Для expenses-сделок не добавляем актив, только кредит
    if (!deal.expenses) {
      // Добавляем актив
      const asset = {
        title: deal.title,
        cost: deal.cost,
        cashFlow: deal.passiveIncome || deal.cashFlow,
        type: deal.type === 'big' ? 'big_deal_credit_card' : 'small_deal_credit_card',
        description: deal.description,
        isRealEstate: deal.isRealEstate
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
   * Устанавливает флаг броска кубика для текущего хода
   * @param {string} gameId - ID игры
   * @param {boolean} rolled - Был ли брошен кубик
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setDiceRolledThisTurn(gameId, rolled) {
    return await this.databaseService.setDiceRolledThisTurn(gameId, rolled);
  }
}

module.exports = GameService;
