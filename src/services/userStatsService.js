const { formatNumber } = require('../utils');

/**
 * Сервис для работы со статистикой пользователей
 * Отвечает за создание, получение и обновление статистики игроков
 */
class UserStatsService {
  constructor(databaseService) {
    this.databaseService = databaseService;
  }

  /**
   * Получает статистику пользователя
   * @param {string} userId - ID пользователя
   * @returns {Promise<Object|null>} Статистика пользователя или null
   */
  async getUserStats(userId) {
    const statsCollection = this.databaseService.getCollection('userStats');
    return await statsCollection.findOne({ userId });
  }

  /**
   * Создает запись статистики для нового пользователя
   * @param {string} userId - ID пользователя
   * @param {string} username - Имя пользователя
   * @returns {Promise<Object>} Созданная статистика
   */
  async createUserStats(userId, username) {
    const statsCollection = this.databaseService.getCollection('userStats');
    const initialStats = {
      userId,
      username,
      totalGames: 0,
      wins: 0,
      losses: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await statsCollection.insertOne(initialStats);
    return initialStats;
  }

  /**
   * Обновляет статистику пользователя
   * @param {string} userId - ID пользователя
   * @param {Object} updates - Обновления { totalGames, wins, losses, username }
   * @returns {Promise<Object>} Обновленная статистика
   */
  async updateUserStats(userId, updates) {
    const statsCollection = this.databaseService.getCollection('userStats');

    const updateData = {
      ...updates,
      updatedAt: new Date()
    };

    await statsCollection.updateOne(
      { userId },
      { $set: updateData },
      { upsert: true }
    );

    return await this.getUserStats(userId);
  }

  /**
   * Получает или создает статистику пользователя
   * @param {string} userId - ID пользователя
   * @param {string} username - Имя пользователя
   * @returns {Promise<Object>} Статистика пользователя
   */
  async getOrCreateUserStats(userId, username) {
    let stats = await this.getUserStats(userId);
    if (!stats) {
      stats = await this.createUserStats(userId, username);
    } else if (stats.username !== username) {
      // Обновить имя пользователя, если оно изменилось
      stats = await this.updateUserStats(userId, { username });
    }
    return stats;
  }

  /**
   * Обновляет статистику после завершения игры
   * @param {Object} game - Объект завершенной игры
   * @returns {Promise<void>}
   */
  async updateStatsAfterGame(game) {
    for (const player of game.players) {
      const currentStats = await this.getOrCreateUserStats(player.userId, player.username);

      const updates = {
        totalGames: currentStats.totalGames + 1,
        wins: 0, // Пока оставляем 0, логику побед добавим позже
        losses: 0 // Пока оставляем 0, логику побед добавим позже
      };

      await this.updateUserStats(player.userId, updates);
    }
  }

  /**
   * Статический метод для форматирования статистики
   * @param {Object} stats - Объект статистики
   * @returns {string} Отформатированная строка
   */
  static formatUserStats(stats) {
    if (!stats || stats.totalGames === 0) {
      return '📊 Статистика: игр не сыграно';
    }

    const winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;
    return `📊 Всего игр: ${stats.totalGames} (${winRate}% побед) \nПобед: ${stats.wins} \nПоражений: ${stats.losses}`;
  }
}

module.exports = UserStatsService;
