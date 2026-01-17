class GameService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Создает новую игру
   * @param {string} userId - ID создателя игры
   * @returns {Promise<string>} ID созданной игры
   */
  async createGame(userId) {
    const gamesCollection = this.db.collection('games');
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
    const gamesCollection = this.db.collection('games');
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
    const gamesCollection = this.db.collection('games');
    return await gamesCollection.findOne({ gameId });
  }

  /**
   * Получает список активных игр пользователя
   * @param {string} userId - ID пользователя
   * @returns {Promise<Array>} Массив игр пользователя
   */
  async getUserGames(userId) {
    const gamesCollection = this.db.collection('games');
    return await gamesCollection.find({
      players: userId,
      status: { $in: ['waiting', 'active'] }
    }).toArray();
  }
}

module.exports = GameService;
