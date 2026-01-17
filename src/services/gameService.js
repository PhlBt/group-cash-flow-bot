class GameService {
  constructor(databaseService) {
    this.databaseService = databaseService;
  }

  /**
   * Создает новую игру
   * @param {string} userId - ID создателя игры
   * @returns {Promise<string>} ID созданной игры
   */
  async createGame(userId) {
    return await this.databaseService.createGame(userId);
  }

  /**
   * Присоединяет игрока к существующей игре
   * @param {string} userId - ID игрока
   * @param {string} gameId - ID игры
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async joinGame(userId, gameId) {
    return await this.databaseService.joinGame(userId, gameId);
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
}

module.exports = GameService;
