const { MongoClient } = require('mongodb');
const { getRandomProfession } = require('../game/cards/professions');

/**
 * Сервис для работы с MongoDB
 * Отвечает за подключение к базе данных и предоставление доступа к коллекциям
 */
class DatabaseService {
  constructor(mongoUrl, databaseName) {
    this.mongoUrl = mongoUrl;
    this.databaseName = databaseName;
    this.client = null;
    this.db = null;
  }

  /**
   * Подключается к MongoDB
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      this.client = new MongoClient(this.mongoUrl);
      await this.client.connect();
      this.db = this.client.db(this.databaseName);
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Возвращает экземпляр базы данных
   * @returns {Db} Экземпляр базы данных MongoDB
   */
  getDb() {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Возвращает коллекцию по имени
   * @param {string} collectionName - Имя коллекции
   * @returns {Collection} Коллекция MongoDB
   */
  getCollection(collectionName) {
    return this.getDb().collection(collectionName);
  }

  /**
   * Создает новую игру
   * @param {string} chatId - ID чата
   * @param {string} userId - ID создателя игры
   * @param {string} username - Имя пользователя
   * @returns {Promise<string>} ID созданной игры
   */
  async createGame(chatId, userId, username) {
    const gamesCollection = this.getCollection('games');
    const gameId = Date.now().toString(); // Простой ID на основе timestamp

    const profession = getRandomProfession();

    // Рассчитываем базовые расходы (без кредитов)
    const creditMonthlyPayments = profession.credits.reduce((sum, credit) => sum + credit.monthlyPayment, 0);
    const baseExpenses = profession.totalExpenses - creditMonthlyPayments;

    // Инициализируем liabilities с кредитами профессии
    const liabilities = profession.credits.map(credit => ({
      title: credit.title,
      cost: credit.cost,
      downPayment: 0,
      loanAmount: credit.cost,
      monthlyPayment: credit.monthlyPayment
    }));

    const player = {
      userId,
      username,
      profession: profession.name,
      cash: profession.savings,
      salary: profession.salary,
      expenses: baseExpenses,
      childrenCount: 0,
      childrenExpenses: 0,
      passiveIncome: profession.passiveIncome,
      totalIncome: profession.salary,
      totalExpenses: profession.totalExpenses,
      cashFlow: profession.cashFlow,
      assets: [], // массив активов
      assetsCount: 0,
      liabilities: liabilities,
      loansCount: liabilities.length,
      totalLoans: liabilities.reduce((sum, liab) => sum + liab.loanAmount, 0),
      totalLoanPayments: creditMonthlyPayments,
      kidCost: profession.kidCost,
      position: 0,
      inFastTrack: false,
      fastTrackCash: 0,
      fastTrackIncome: 0,
      dreamCost: 0,
      charityEffect: false,
      charityTurnsLeft: 0,
      bankruptcyState: false,
      skippedTurns: 0
    };

    await gamesCollection.insertOne({
      gameId,
      chatId,
      creatorId: userId,
      players: [player],
      status: 'waiting',
      createdAt: new Date(),
      endGameVotes: [],
      endGameMessageId: null,
      waitingMessageId: null,
      currentDeal: null,
      currentDealQuantity: 1,
      dealCirculationPlayers: [],
      dealCirculationIndex: 0,
      dealCirculationOriginalIndex: 0,
      currentMarket: null,
      usedMarketIds: [],
      marketCirculationPlayers: [],
      marketCirculationIndex: 0,
      marketCirculationOriginalIndex: 0
    });

    return gameId;
  }

  /**
   * Присоединяет игрока к существующей игре
   * @param {string} userId - ID игрока
   * @param {string} gameId - ID игры
   * @param {string} username - Имя пользователя
   * @returns {Promise<{success: boolean, error?: string, player?: Object}>} Результат операции
   */
  async joinGame(userId, gameId, username) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    if (game.players.length >= 12) {
      return { success: false, error: 'max_players_reached' };
    }

    if (game.players.some(player => player.userId === userId)) {
      return { success: false, error: 'already_joined' };
    }

    if (game.status !== 'waiting') {
      return { success: false, error: 'game_started' };
    }

    const excludedProfessions = game.players.map(p => p.profession);
    const profession = getRandomProfession(excludedProfessions);

    // Рассчитываем базовые расходы (без кредитов)
    const creditMonthlyPayments = profession.credits.reduce((sum, credit) => sum + credit.monthlyPayment, 0);
    const baseExpenses = profession.totalExpenses - creditMonthlyPayments;

    // Инициализируем liabilities с кредитами профессии
    const liabilities = profession.credits.map(credit => ({
      title: credit.title,
      cost: credit.cost,
      downPayment: 0,
      loanAmount: credit.cost,
      monthlyPayment: credit.monthlyPayment
    }));

    const player = {
      userId,
      username,
      profession: profession.name,
      cash: profession.savings,
      salary: profession.salary,
      expenses: baseExpenses,
      childrenCount: 0,
      childrenExpenses: 0,
      passiveIncome: profession.passiveIncome,
      totalIncome: profession.salary,
      totalExpenses: profession.totalExpenses,
      cashFlow: profession.cashFlow,
      assets: [], // массив активов
      assetsCount: 0,
      liabilities: liabilities,
      loansCount: liabilities.length,
      totalLoans: liabilities.reduce((sum, liab) => sum + liab.loanAmount, 0),
      totalLoanPayments: creditMonthlyPayments,
      kidCost: profession.kidCost,
      position: game.players.length, // позиция начиная с 0
      inFastTrack: false,
      fastTrackCash: 0,
      fastTrackIncome: 0,
      dreamCost: 0,
      charityEffect: false,
      charityTurnsLeft: 0,
      bankruptcyState: false,
      skippedTurns: 0
    };

    await gamesCollection.updateOne(
      { gameId },
      { $push: { players: player } }
    );

    return { success: true, player };
  }

  /**
   * Получает информацию об игре
   * @param {string} gameId - ID игры
   * @returns {Promise<Object|null>} Документ игры или null
   */
  async getGame(gameId) {
    const gamesCollection = this.getCollection('games');
    return await gamesCollection.findOne({ gameId });
  }

  /**
   * Начинает игру (меняет статус на 'active')
   * @param {string} userId - ID пользователя (должен быть создателем)
   * @param {string} gameId - ID игры
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async startGame(userId, gameId) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    if (game.creatorId !== userId) {
      return { success: false, error: 'not_creator' };
    }

    if (game.status !== 'waiting') {
      return { success: false, error: 'already_started' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: { status: 'active', startedAt: new Date(), currentPlayerIndex: 0, diceRolledThisTurn: false } }
    );

    return { success: true };
  }

  /**
   * Получает список активных игр пользователя
   * @param {string} userId - ID пользователя
   * @returns {Promise<Array>} Массив игр пользователя
   */
  async getUserGames(userId) {
    const gamesCollection = this.getCollection('games');
    return await gamesCollection.find({
      'players.userId': userId,
      status: { $in: ['waiting', 'active'] }
    }).toArray();
  }

  /**
   * Получает активную игру для чата
   * @param {string} chatId - ID чата
   * @returns {Promise<Object|null>} Документ игры или null
   */
  async getActiveGameByChatId(chatId) {
    const gamesCollection = this.getCollection('games');
    return await gamesCollection.findOne({
      chatId,
      status: { $in: ['waiting', 'active'] }
    });
  }

  /**
   * Инициирует голосование за окончание игры
   * @param {string} userId - ID пользователя
   * @param {string} gameId - ID игры
   * @param {number} messageId - ID сообщения голосования
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async initiateEndGameVote(userId, gameId, messageId) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    if (game.status === 'finished') {
      return { success: false, error: 'already_finished' };
    }

    if (!game.players.some(player => player.userId === userId)) {
      return { success: false, error: 'not_player' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: { endGameVotes: [userId], endGameMessageId: messageId } }
    );

    return { success: true };
  }

  /**
   * Голосует за окончание игры
   * @param {string} userId - ID пользователя
   * @param {string} gameId - ID игры
   * @returns {Promise<{success: boolean, error?: string, shouldFinish?: boolean}>} Результат операции
   */
  async voteToEndGame(userId, gameId) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    if (game.status === 'finished') {
      return { success: false, error: 'already_finished' };
    }

    if (!game.players.some(player => player.userId === userId)) {
      return { success: false, error: 'not_player' };
    }

    if (game.endGameVotes.includes(userId)) {
      return { success: false, error: 'already_voted' };
    }

    const newVotes = [...game.endGameVotes, userId];
    const majority = Math.ceil(game.players.length / 2);

    await gamesCollection.updateOne(
      { gameId },
      { $set: { endGameVotes: newVotes } }
    );

    return { success: true, shouldFinish: newVotes.length >= majority };
  }

  /**
   * Завершает игру
   * @param {string} gameId - ID игры
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async finishGame(gameId) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    if (game.status === 'finished') {
      return { success: false, error: 'already_finished' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: { status: 'finished', finishedAt: new Date() } }
    );

    return { success: true };
  }

  /**
   * Устанавливает ID сообщения комнаты ожидания
   * @param {string} gameId - ID игры
   * @param {number} messageId - ID сообщения
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setWaitingMessageId(gameId, messageId) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: { waitingMessageId: messageId } }
    );

    return { success: true };
  }

  /**
   * Устанавливает текущую сделку для игры
   * @param {string} gameId - ID игры
   * @param {Object} deal - Объект сделки
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setCurrentDeal(gameId, deal) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: { currentDeal: deal, currentDealQuantity: 1 } }
    );

    return { success: true };
  }

  /**
   * Устанавливает количество для текущей сделки
   * @param {string} gameId - ID игры
   * @param {number} quantity - Количество
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setCurrentDealQuantity(gameId, quantity) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: { currentDealQuantity: quantity } }
    );

    return { success: true };
  }

  /**
   * Обновляет позицию игрока
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {number} newPosition - Новая позиция
   * @param {boolean} inFastTrack - Находится ли на Fast Track
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async updatePlayerPosition(gameId, userId, newPosition, inFastTrack = false) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(player => player.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const updateField = `players.${playerIndex}`;
    await gamesCollection.updateOne(
      { gameId },
      {
        $set: {
          [`${updateField}.position`]: newPosition,
          [`${updateField}.inFastTrack`]: inFastTrack
        }
      }
    );

    return { success: true };
  }

  /**
   * Устанавливает эффект благотворительности для игрока
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {boolean} effect - Включить/выключить эффект
   * @param {number} turnsLeft - Количество ходов (если effect = true)
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setCharityEffect(gameId, userId, effect, turnsLeft = 0) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(player => player.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const updateData = {
      [`players.${playerIndex}.charityEffect`]: effect
    };

    if (effect) {
      updateData[`players.${playerIndex}.charityTurnsLeft`] = turnsLeft;
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: updateData }
    );

    return { success: true };
  }

  /**
   * Уменьшает счетчик ходов благотворительности
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @returns {Promise<{success: boolean, error?: string, turnsLeft?: number, effectEnded?: boolean}>} Результат операции
   */
  async decreaseCharityTurns(gameId, userId) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(player => player.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const player = game.players[playerIndex];
    if (!player.charityEffect || player.charityTurnsLeft <= 0) {
      return { success: true, turnsLeft: 0, effectEnded: false };
    }

    const newTurnsLeft = player.charityTurnsLeft - 1;
    const effectEnded = newTurnsLeft <= 0;

    const updateData = {
      [`players.${playerIndex}.charityTurnsLeft`]: Math.max(0, newTurnsLeft)
    };

    if (effectEnded) {
      updateData[`players.${playerIndex}.charityEffect`] = false;
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: updateData }
    );

    return {
      success: true,
      turnsLeft: Math.max(0, newTurnsLeft),
      effectEnded
    };
  }

  /**
   * Передает ход следующему игроку
   * @param {string} gameId - ID игры
   * @returns {Promise<{success: boolean, error?: string, nextPlayerIndex?: number}>} Результат операции
   */
  async nextTurn(gameId) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const nextPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;

    await gamesCollection.updateOne(
      { gameId },
      { $set: { currentPlayerIndex: nextPlayerIndex, diceRolledThisTurn: false } }
    );

    return { success: true, nextPlayerIndex };
  }

  /**
   * Добавляет актив игроку
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {Object} asset - Объект актива (title, cost, cashFlow, type)
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async addAsset(gameId, userId, asset) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(player => player.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const player = game.players[playerIndex];
    const newAssets = [...player.assets, asset];
    const newAssetsCount = newAssets.length;
    const assetCashFlow = asset.cashFlow || 0; // Проверка на undefined/null
    const newPassiveIncome = player.passiveIncome + assetCashFlow;

    await gamesCollection.updateOne(
      { gameId },
      {
        $set: {
          [`players.${playerIndex}.assets`]: newAssets,
          [`players.${playerIndex}.assetsCount`]: newAssetsCount,
          [`players.${playerIndex}.passiveIncome`]: newPassiveIncome,
          [`players.${playerIndex}.totalIncome`]: player.salary + newPassiveIncome,
          [`players.${playerIndex}.cashFlow`]: player.salary + newPassiveIncome - player.totalExpenses
        }
      }
    );

    return { success: true };
  }

  /**
   * Добавляет пассив (кредит) игроку
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {Object} liability - Объект пассива (title, cost, downPayment, loanAmount, monthlyPayment)
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async addLiability(gameId, userId, liability) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(player => player.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const player = game.players[playerIndex];
    const newLiabilities = [...player.liabilities, liability];
    const newLoansCount = newLiabilities.length;
    const newTotalLoans = player.totalLoans + liability.loanAmount;
    const newTotalLoanPayments = player.totalLoanPayments + liability.monthlyPayment;
    const newTotalExpenses = player.expenses + player.childrenExpenses + newTotalLoanPayments;
    const newCashFlow = player.salary + player.passiveIncome - newTotalExpenses;

    await gamesCollection.updateOne(
      { gameId },
      {
        $set: {
          [`players.${playerIndex}.liabilities`]: newLiabilities,
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
   * Обновляет финансовые поля игрока после изменений активов/пассивов
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {Object} updates - объект с обновлениями { assets, assetsCount, passiveIncome, totalExpenses, cashFlow }
   */
  async updatePlayerFinancialFields(gameId, userId, updates) {
    const gamesCollection = this.getCollection('games');

    // Найти индекс игрока
    const game = await gamesCollection.findOne({ gameId });
    if (!game) return { success: false, error: 'game_not_found' };

    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) return { success: false, error: 'player_not_found' };

    const player = game.players[playerIndex];

    // Подготовить обновления
    const setUpdates = {};
    Object.keys(updates).forEach(key => {
      setUpdates[`players.${playerIndex}.${key}`] = updates[key];
    });

    // Пересчитать производные поля
    if (updates.passiveIncome !== undefined || updates.totalExpenses !== undefined) {
      const newPassiveIncome = updates.passiveIncome ?? player.passiveIncome;
      const newTotalExpenses = updates.totalExpenses ?? player.totalExpenses;

      setUpdates[`players.${playerIndex}.totalIncome`] = player.salary + newPassiveIncome;
      setUpdates[`players.${playerIndex}.cashFlow`] = player.salary + newPassiveIncome - newTotalExpenses;
    }

    await gamesCollection.updateOne({ gameId }, { $set: setUpdates });

    return { success: true };
  }

  /**
   * Устанавливает флаг броска кубика для текущего хода
   * @param {string} gameId - ID игры
   * @param {boolean} rolled - Был ли брошен кубик
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setDiceRolledThisTurn(gameId, rolled) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: { diceRolledThisTurn: rolled } }
    );

    return { success: true };
  }

  /**
   * Устанавливает список игроков для циркуляции сделки
   * @param {string} gameId - ID игры
   * @param {Array} players - Массив userId игроков
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setDealCirculationPlayers(gameId, players) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: { dealCirculationPlayers: players, dealCirculationIndex: 0 } }
    );

    return { success: true };
  }

  /**
   * Увеличивает индекс циркуляции сделки
   * @param {string} gameId - ID игры
   * @returns {Promise<{success: boolean, error?: string, completed?: boolean}>} Результат операции
   */
  async incrementDealCirculationIndex(gameId) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const newIndex = game.dealCirculationIndex + 1;
    const completed = newIndex >= game.dealCirculationPlayers.length;

    await gamesCollection.updateOne(
      { gameId },
      { $set: { dealCirculationIndex: newIndex } }
    );

    return { success: true, completed };
  }

  /**
   * Очищает данные циркуляции сделки
   * @param {string} gameId - ID игры
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async clearDealCirculation(gameId) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    await gamesCollection.updateOne(
      { gameId },
      {
        $set: {
          dealCirculationPlayers: [],
          dealCirculationIndex: 0,
          dealCirculationOriginalIndex: 0
        }
      }
    );

    return { success: true };
  }

  /**
   * Устанавливает оригинальный индекс циркуляции сделки
   * @param {string} gameId - ID игры
   * @param {number} originalIndex - Оригинальный индекс
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setDealCirculationOriginalIndex(gameId, originalIndex) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: { dealCirculationOriginalIndex: originalIndex } }
    );

    return { success: true };
  }

  /**
   * Устанавливает состояние предложения сделки
   * @param {string} gameId - ID игры
   * @param {Object|null} offerState - Состояние предложения или null для очистки
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setOfferState(gameId, offerState) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: { offerState } }
    );

    return { success: true };
  }

  /**
   * Обновляет баланс игрока
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {number} amount - Сумма изменения (положительная или отрицательная)
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async updatePlayerCash(gameId, userId, amount) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const playerIndex = game.players.findIndex(player => player.userId === userId);
    if (playerIndex === -1) {
      return { success: false, error: 'player_not_found' };
    }

    const currentCash = game.players[playerIndex].cash;
    const newCash = currentCash + amount;

    await gamesCollection.updateOne(
      { gameId },
      { $set: { [`players.${playerIndex}.cash`]: newCash } }
    );

    return { success: true };
  }

  /**
   * Устанавливает использованные ID больших сделок
   * @param {string} gameId - ID игры
   * @param {Array} usedIds - Массив использованных ID
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setUsedBigDealIds(gameId, usedIds) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: { usedBigDealIds: usedIds } }
    );

    return { success: true };
  }

  /**
   * Устанавливает использованные ID малых сделок
   * @param {string} gameId - ID игры
   * @param {Array} usedIds - Массив использованных ID
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setUsedSmallDealIds(gameId, usedIds) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: { usedSmallDealIds: usedIds } }
    );

    return { success: true };
  }

  /**
   * Устанавливает использованные ID miscellaneous
   * @param {string} gameId - ID игры
   * @param {Array} usedIds - Массив использованных индексов
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setUsedMiscellaneousIds(gameId, usedIds) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: { usedMiscellaneousIds: usedIds } }
    );

    return { success: true };
  }

  /**
   * Устанавливает текущую miscellaneous карточку
   * @param {string} gameId - ID игры
   * @param {Object} miscCard - Объект miscellaneous карточки
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setCurrentMiscellaneous(gameId, miscCard) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: { currentMiscellaneous: miscCard } }
    );

    return { success: true };
  }

  /**
   * Устанавливает текущую market карточку
   * @param {string} gameId - ID игры
   * @param {Object} marketCard - Объект market карточки
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setCurrentMarket(gameId, marketCard) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: { currentMarket: marketCard } }
    );

    return { success: true };
  }

  /**
   * Устанавливает использованные ID market карточек
   * @param {string} gameId - ID игры
   * @param {Array} usedIds - Массив использованных названий карточек
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setUsedMarketIds(gameId, usedIds) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: { usedMarketIds: usedIds } }
    );

    return { success: true };
  }

  /**
   * Устанавливает список игроков для циркуляции market
   * @param {string} gameId - ID игры
   * @param {Array} players - Массив userId игроков
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setMarketCirculationPlayers(gameId, players) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: { marketCirculationPlayers: players, marketCirculationIndex: 0 } }
    );

    return { success: true };
  }

  /**
   * Устанавливает индекс циркуляции market
   * @param {string} gameId - ID игры
   * @param {number} index - Индекс циркуляции
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setMarketCirculationIndex(gameId, index) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: { marketCirculationIndex: index } }
    );

    return { success: true };
  }

  /**
   * Увеличивает индекс циркуляции market
   * @param {string} gameId - ID игры
   * @returns {Promise<{success: boolean, error?: string, completed?: boolean}>} Результат операции
   */
  async incrementMarketCirculationIndex(gameId) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    const newIndex = game.marketCirculationIndex + 1;
    const completed = newIndex >= game.marketCirculationPlayers.length;

    await gamesCollection.updateOne(
      { gameId },
      { $set: { marketCirculationIndex: newIndex } }
    );

    return { success: true, completed };
  }

  /**
   * Устанавливает оригинальный индекс циркуляции market
   * @param {string} gameId - ID игры
   * @param {number} originalIndex - Оригинальный индекс
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async setMarketCirculationOriginalIndex(gameId, originalIndex) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $set: { marketCirculationOriginalIndex: originalIndex } }
    );

    return { success: true };
  }

  /**
   * Очищает данные циркуляции market
   * @param {string} gameId - ID игры
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async clearMarketCirculation(gameId) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    await gamesCollection.updateOne(
      { gameId },
      {
        $set: {
          marketCirculationPlayers: [],
          marketCirculationIndex: 0,
          marketCirculationOriginalIndex: 0
        }
      }
    );

    return { success: true };
  }

  /**
   * Закрывает подключение к базе данных
   * @returns {Promise<void>}
   */
  async close() {
    if (this.client) {
      await this.client.close();
      console.log('MongoDB connection closed');
    }
  }
}

module.exports = DatabaseService;
