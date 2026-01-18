const { MongoClient } = require('mongodb');
const { getRandomProfession } = require('../game/professions');

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
    const player = {
      userId,
      username,
      profession: profession.name,
      cash: profession.savings,
      salary: profession.salary,
      expenses: profession.expenses,
      childrenCount: 0,
      childrenExpenses: 0,
      passiveIncome: 0,
      totalIncome: profession.salary,
      totalExpenses: profession.expenses,
      cashFlow: profession.salary - profession.expenses,
      assets: [], // массив активов
      assetsCount: 0,
      liabilities: [], // массив пассивов/кредитов
      liabilitiesCount: 0,
      loansCount: 0,
      totalLoans: 0,
      totalLoanPayments: 0,
      position: 0,
      inFastTrack: false,
      fastTrackCash: 0,
      fastTrackIncome: 0,
      dreamCost: 0,
      charityEffect: false,
      charityTurnsLeft: 0
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
      waitingMessageId: null
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

    if (game.players.some(player => player.userId === userId)) {
      return { success: false, error: 'already_joined' };
    }

    if (game.status !== 'waiting') {
      return { success: false, error: 'game_started' };
    }

    const profession = getRandomProfession();
    const player = {
      userId,
      username,
      profession: profession.name,
      cash: profession.savings,
      salary: profession.salary,
      expenses: profession.expenses,
      childrenCount: 0,
      childrenExpenses: 0,
      passiveIncome: 0,
      totalIncome: profession.salary,
      totalExpenses: profession.expenses,
      cashFlow: profession.salary - profession.expenses,
      assets: [], // массив активов
      assetsCount: 0,
      liabilities: [], // массив пассивов/кредитов
      liabilitiesCount: 0,
      loansCount: 0,
      totalLoans: 0,
      totalLoanPayments: 0,
      position: game.players.length, // позиция начиная с 0
      inFastTrack: false,
      fastTrackCash: 0,
      fastTrackIncome: 0,
      dreamCost: 0,
      charityEffect: false,
      charityTurnsLeft: 0
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
      { $set: { status: 'active', startedAt: new Date(), currentPlayerIndex: 0 } }
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
      { $set: { currentPlayerIndex: nextPlayerIndex } }
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
    const newPassiveIncome = player.passiveIncome + asset.cashFlow;

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
    const newLiabilitiesCount = newLiabilities.length;
    const newLoansCount = player.loansCount + 1;
    const newTotalLoans = player.totalLoans + liability.loanAmount;
    const newTotalLoanPayments = player.totalLoanPayments + liability.monthlyPayment;
    const newTotalExpenses = player.expenses + player.childrenExpenses + newTotalLoanPayments;
    const newCashFlow = player.salary + player.passiveIncome - newTotalExpenses;

    await gamesCollection.updateOne(
      { gameId },
      {
        $set: {
          [`players.${playerIndex}.liabilities`]: newLiabilities,
          [`players.${playerIndex}.liabilitiesCount`]: newLiabilitiesCount,
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
