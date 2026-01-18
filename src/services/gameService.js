class GameService {
  constructor(databaseService) {
    this.databaseService = databaseService;
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
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async buySmallDeal(gameId, userId, deal) {
    const game = await this.databaseService.getGame(gameId);
    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, error: 'player_not_found' };
    }

    // Проверяем хватает ли денег
    if (player.cash < deal.cost) {
      return { success: false, error: 'insufficient_funds' };
    }

    // Списываем стоимость
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
      cashFlow: deal.cashFlow,
      type: 'small_deal',
      description: deal.description
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

    // Проверяем хватает ли денег на первоначальный взнос
    if (player.cash < deal.downPayment) {
      return { success: false, error: 'insufficient_funds' };
    }

    // Рассчитываем ежемесячный платеж по кредиту (0.01% от стоимости)
    const monthlyPayment = Math.floor(deal.cost * 0.0001); // 0.01%
    const loanAmount = deal.cost - deal.downPayment;

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
      cashFlow: deal.cashFlow,
      type: 'big_deal',
      description: deal.description
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

    // Добавляем актив
    const asset = {
      title: deal.title,
      cost: deal.cost,
      cashFlow: deal.cashFlow,
      type: deal.type === 'big' ? 'big_deal_credit_card' : 'small_deal_credit_card',
      description: deal.description
    };

    await this.databaseService.addAsset(gameId, userId, asset);

    // Добавляем кредитку как liability
    const liability = {
      title: `Кредитная карта - ${deal.title}`,
      cost: deal.cost,
      monthlyPayment: monthlyPayment,
      type: 'credit_card_loan'
    };

    await this.databaseService.addLiability(gameId, userId, liability);

    return { success: true };
  }
}

module.exports = GameService;
