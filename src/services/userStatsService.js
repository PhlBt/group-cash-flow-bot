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
   * Обновляет статистику всех игроков в игре (увеличивает totalGames)
   * @param {string} gameId - ID игры
   * @param {Object} gameService - Экземпляр GameService для получения данных игры
   * @returns {Promise<{success: boolean, updatedCount: number, errors: Array}>} Результат операции
   */
  async updatePlayersGameStats(gameId, gameService) {
    try {
      // Получаем игру и всех игроков
      const game = await gameService.getGame(gameId);
      if (!game || !game.players) {
        return { success: false, updatedCount: 0, errors: ['Game not found or no players'] };
      }

      const statsCollection = this.databaseService.getCollection('userStats');
      const playerUserIds = game.players.map(p => p.userId);
      
      // 1. Получаем всю статистику игроков одним запросом
      const existingStats = await statsCollection.find({ userId: { $in: playerUserIds } }).toArray();
      const statsMap = new Map(existingStats.map(stat => [stat.userId, stat]));

      // 2. Формируем bulk операции в цикле
      const bulkOps = [];
      let updatedCount = 0;

      for (const player of game.players) {
        const existingStat = statsMap.get(player.userId);
        
        if (existingStat) {
          // Обновляем существующую статистику
          bulkOps.push({
            updateOne: {
              filter: { userId: player.userId },
              update: {
                $set: {
                  totalGames: existingStat.totalGames + 1,
                  username: player.username,
                  updatedAt: new Date()
                }
              }
            }
          });
          updatedCount++;
        } else {
          // Создаем новую статистику
          bulkOps.push({
            insertOne: {
              document: {
                userId: player.userId,
                username: player.username,
                totalGames: 1,
                wins: 0,
                losses: 0,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            }
          });
          updatedCount++;
        }
      }

      // 3. Выполняем все операции одной bulk операцией
      if (bulkOps.length > 0) {
        await statsCollection.bulkWrite(bulkOps);
      }

      return { 
        success: true, 
        updatedCount, 
        errors: [] 
      };
    } catch (error) {
      console.error('Error in updatePlayersGameStats:', error);
      return { success: false, updatedCount: 0, errors: [error.message] };
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
    return `\n📊 Всего игр: ${stats.totalGames} (${winRate}% побед) \n🏆 Побед: ${stats.wins} \n🥺 Поражений: ${stats.losses}`;
  }
}

module.exports = UserStatsService;
