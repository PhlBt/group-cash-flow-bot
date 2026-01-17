/**
 * Оптимизированный сервис базы данных
 * Использует индексы, агрегацию и эффективные запросы для улучшения производительности
 */

class OptimizedDbService {
  constructor(dbService) {
    this.dbService = dbService;
  }

  /**
   * Оптимизированная загрузка игры с предварительной загрузкой игроков
   */
  async loadGame(chatId) {
    try {
      // Используем агрегацию для загрузки игры с игроками за один запрос
      const gameDoc = await this.dbService.Game.findOne({ chatId })
        .populate('players')
        .populate('currentPlayerId')
        .lean();

      if (!gameDoc) return null;

      // Преобразуем документ в объект игры
      const game = {
        chatId: gameDoc.chatId,
        players: new Map(),
        currentPlayerId: gameDoc.currentPlayerId,
        gameStarted: gameDoc.gameStarted,
        gameFinished: gameDoc.gameFinished,
        currentCard: gameDoc.currentCard,
        waitingForAction: gameDoc.waitingForAction,
        loser: gameDoc.loser,
        winner: gameDoc.winner,
        kickVotes: new Map(gameDoc.kickVotes || [])
      };

      // Преобразуем игроков в Map
      if (gameDoc.players) {
        gameDoc.players.forEach(playerDoc => {
          const player = this.playerDocToPlayer(playerDoc);
          game.players.set(player.userId, player);
        });
      }

      return game;
    } catch (error) {
      console.error('Ошибка загрузки игры:', error);
      return null;
    }
  }

  /**
   * Быстрое сохранение игры с обновлением только измененных полей
   */
  async saveGame(game) {
    try {
      const updateData = {
        currentPlayerId: game.currentPlayerId,
        gameStarted: game.gameStarted,
        gameFinished: game.gameFinished,
        currentCard: game.currentCard,
        waitingForAction: game.waitingForAction,
        loser: game.loser,
        winner: game.winner,
        kickVotes: Array.from(game.kickVotes.entries()),
        updatedAt: new Date()
      };

      // Обновляем только основные поля игры
      await this.dbService.Game.updateOne(
        { chatId: game.chatId },
        { $set: updateData },
        { upsert: true }
      );

      // Сохраняем игроков отдельно
      for (const player of game.players.values()) {
        await this.savePlayer(player, game.chatId);
      }

    } catch (error) {
      console.error('Ошибка сохранения игры:', error);
      throw error;
    }
  }

  /**
   * Оптимизированное сохранение игрока
   */
  async savePlayer(player, chatId) {
    try {
      const playerData = this.playerToPlayerData(player);

      await this.dbService.Player.updateOne(
        { userId: player.userId, chatId },
        { $set: playerData },
        { upsert: true }
      );
    } catch (error) {
      console.error('Ошибка сохранения игрока:', error);
      throw error;
    }
  }

  /**
   * Быстрая загрузка статистики игрока с использованием индекса
   */
  async getPlayerStats(userId) {
    try {
      const stats = await this.dbService.PlayerStats.findOne({ userId })
        .select('-_id -__v') // Исключаем служебные поля
        .lean();

      return stats;
    } catch (error) {
      console.error('Ошибка получения статистики игрока:', error);
      return null;
    }
  }

  /**
   * Оптимизированная загрузка топа игроков с использованием агрегации
   */
  async getTopPlayers(sortBy = 'gamesWon', limit = 10) {
    try {
      const sortField = this.getSortField(sortBy);

      const topPlayers = await this.dbService.PlayerStats
        .aggregate([
          {
            $match: {
              gamesPlayed: { $gte: 1 } // Только игроки, сыгравшие хотя бы одну игру
            }
          },
          {
            $sort: { [sortField]: -1 }
          },
          {
            $limit: limit
          },
          {
            $project: {
              _id: 0,
              username: 1,
              [sortField]: 1,
              totalCashEarned: 1
            }
          }
        ]);

      return topPlayers;
    } catch (error) {
      console.error('Ошибка получения топа игроков:', error);
      return [];
    }
  }

  /**
   * Массовое обновление статистики игры
   */
  async updateGameStats(chatId, stats) {
    try {
      await this.dbService.GameStats.updateOne(
        { chatId },
        {
          $set: {
            ...stats,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Ошибка обновления статистики игры:', error);
      throw error;
    }
  }

  /**
   * Оптимизированное обновление статистики игрока
   */
  async updatePlayerStats(userId, stats) {
    try {
      await this.dbService.PlayerStats.updateOne(
        { userId },
        {
          $set: {
            ...stats,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Ошибка обновления статистики игрока:', error);
      throw error;
    }
  }

  /**
   * Пакетное обновление балансов игроков
   */
  async updatePlayerBalances(chatId, balanceUpdates) {
    try {
      const bulkOps = balanceUpdates.map(update => ({
        updateOne: {
          filter: { userId: update.userId, chatId },
          update: {
            $set: {
              cash: update.cash,
              cashFlow: update.cashFlow,
              updatedAt: new Date()
            }
          }
        }
      }));

      if (bulkOps.length > 0) {
        await this.dbService.Player.bulkWrite(bulkOps);
      }
    } catch (error) {
      console.error('Ошибка пакетного обновления балансов:', error);
      throw error;
    }
  }

  /**
   * Очистка старых данных (старше 30 дней)
   */
  async cleanupOldData() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Удаляем старые игры
      const deletedGames = await this.dbService.Game.deleteMany({
        updatedAt: { $lt: thirtyDaysAgo },
        gameFinished: true
      });

      // Удаляем игроков из завершенных игр
      const deletedPlayers = await this.dbService.Player.deleteMany({
        updatedAt: { $lt: thirtyDaysAgo }
      });

      console.log(`Очищено: ${deletedGames.deletedCount} игр, ${deletedPlayers.deletedCount} игроков`);

      return {
        deletedGames: deletedGames.deletedCount,
        deletedPlayers: deletedPlayers.deletedCount
      };
    } catch (error) {
      console.error('Ошибка очистки старых данных:', error);
      throw error;
    }
  }

  /**
   * Получение статистики базы данных
   */
  async getDatabaseStats() {
    try {
      const [
        gamesCount,
        playersCount,
        gameStatsCount,
        playerStatsCount
      ] = await Promise.all([
        this.dbService.Game.countDocuments(),
        this.dbService.Player.countDocuments(),
        this.dbService.GameStats.countDocuments(),
        this.dbService.PlayerStats.countDocuments()
      ]);

      return {
        games: gamesCount,
        players: playersCount,
        gameStats: gameStatsCount,
        playerStats: playerStatsCount,
        totalDocuments: gamesCount + playersCount + gameStatsCount + playerStatsCount
      };
    } catch (error) {
      console.error('Ошибка получения статистики БД:', error);
      return null;
    }
  }

  // Вспомогательные методы

  getSortField(sortBy) {
    const fieldMap = {
      'gamesWon': 'gamesWon',
      'bestCashFlow': 'bestCashFlow',
      'gamesPlayed': 'gamesPlayed'
    };
    return fieldMap[sortBy] || 'gamesWon';
  }

  playerDocToPlayer(doc) {
    return {
      userId: doc.userId,
      username: doc.username,
      profession: doc.profession,
      salary: doc.salary,
      expenses: doc.expenses,
      childrenCount: doc.childrenCount || 0,
      childrenExpenses: doc.childrenExpenses || 0,
      cash: doc.cash,
      passiveIncome: doc.passiveIncome,
      totalIncome: doc.totalIncome,
      totalExpenses: doc.totalExpenses,
      cashFlow: doc.cashFlow,
      assets: doc.assets || [],
      liabilities: doc.liabilities || [],
      loans: doc.loans || [],
      position: doc.position || 0,
      inFastTrack: doc.inFastTrack || false,
      charityTurnsLeft: doc.charityTurnsLeft || 0,
      skipTurns: doc.skipTurns || 0
    };
  }

  playerToPlayerData(player) {
    return {
      userId: player.userId,
      username: player.username,
      profession: player.profession,
      salary: player.salary,
      expenses: player.expenses,
      childrenCount: player.childrenCount,
      childrenExpenses: player.childrenExpenses,
      cash: player.cash,
      passiveIncome: player.passiveIncome,
      totalIncome: player.totalIncome,
      totalExpenses: player.totalExpenses,
      cashFlow: player.cashFlow,
      assets: player.assets,
      liabilities: player.liabilities,
      loans: player.loans,
      position: player.position,
      inFastTrack: player.inFastTrack,
      charityTurnsLeft: player.charityTurnsLeft,
      skipTurns: player.skipTurns,
      updatedAt: new Date()
    };
  }
}

module.exports = OptimizedDbService;
