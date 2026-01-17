const { MongoClient } = require('mongodb');

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
   * @param {string} userId - ID создателя игры
   * @returns {Promise<string>} ID созданной игры
   */
  async createGame(userId) {
    const gamesCollection = this.getCollection('games');
    const gameId = Date.now().toString(); // Простой ID на основе timestamp

    await gamesCollection.insertOne({
      gameId,
      creatorId: userId,
      players: [userId],
      status: 'waiting',
      createdAt: new Date()
    });

    return gameId;
  }

  /**
   * Присоединяет игрока к существующей игре
   * @param {string} userId - ID игрока
   * @param {string} gameId - ID игры
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async joinGame(userId, gameId) {
    const gamesCollection = this.getCollection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      return { success: false, error: 'not_found' };
    }

    if (game.players.includes(userId)) {
      return { success: false, error: 'already_joined' };
    }

    if (game.status !== 'waiting') {
      return { success: false, error: 'game_started' };
    }

    await gamesCollection.updateOne(
      { gameId },
      { $push: { players: userId } }
    );

    return { success: true };
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
      { $set: { status: 'active', startedAt: new Date() } }
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
      players: userId,
      status: { $in: ['waiting', 'active'] }
    }).toArray();
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
