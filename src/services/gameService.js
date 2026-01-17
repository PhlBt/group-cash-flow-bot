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
   * Перемещает игрока на заданное количество полей
   * @param {string} gameId - ID игры
   * @param {string} userId - ID игрока
   * @param {number} steps - Количество шагов
   * @returns {Promise<{success: boolean, error?: string, newPosition?: number, fieldType?: string}>} Результат операции
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

    const { RAT_RACE_FIELDS, FAST_TRACK_FIELDS, RAT_RACE_SIZE, FAST_TRACK_SIZE } = require('../game/board');

    let currentPosition = player.position;
    let inFastTrack = player.inFastTrack;
    let newPosition;

    // Зацикливание в зависимости от текущего трека
    if (!inFastTrack) {
      // Находимся на "Крысиных бегах"
      newPosition = (currentPosition + steps) % RAT_RACE_SIZE;
    } else {
      // Уже на Fast Track
      newPosition = (currentPosition + steps) % FAST_TRACK_SIZE;
    }

    // Обновляем позицию в базе данных
    const updateResult = await this.databaseService.updatePlayerPosition(gameId, userId, newPosition, inFastTrack);
    if (!updateResult.success) {
      return updateResult;
    }

    // Определяем тип поля, на которое попал игрок
    const currentTrack = inFastTrack ? FAST_TRACK_FIELDS : RAT_RACE_FIELDS;
    const fieldType = currentTrack[newPosition].type;

    return {
      success: true,
      newPosition,
      fieldType,
      inFastTrack
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
}

module.exports = GameService;
