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
}

module.exports = GameService;
