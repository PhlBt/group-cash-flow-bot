const mongoose = require('mongoose');
const { Game, Player, Asset, Loan, GameStats, PlayerStats } = require('../models');
const config = require('../config');

class DatabaseService {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;

    try {
      await mongoose.connect(config.mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: config.mongoDatabase,
      });
      this.isConnected = true;
      console.log('✅ Подключено к MongoDB');
    } catch (error) {
      console.error('❌ Ошибка подключения к MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('✅ Отключено от MongoDB');
    }
  }

  // Создание новой игры
  async createGame(chatId) {
    try {
      const game = new Game({
        chatId,
        players: [],
        currentPlayerId: null,
        gameStarted: false,
        gameFinished: false,
        currentCard: null,
        waitingForAction: false,
        winner: null,
        loser: null,
        kickVotes: new Map()
      });
      await game.save();
      return game;
    } catch (error) {
      console.error('Ошибка создания игры:', error);
      throw error;
    }
  }

  // Получение игры по chatId
  async getGame(chatId) {
    try {
      const game = await Game.findOne({ chatId })
        .populate('players')
        .populate('winner')
        .populate('loser');
      return game;
    } catch (error) {
      console.error('Ошибка получения игры:', error);
      throw error;
    }
  }

  // Сохранение игры
  async saveGame(gameData) {
    try {
      const game = await Game.findOneAndUpdate(
        { chatId: gameData.chatId },
        gameData,
        { new: true, upsert: true }
      );
      return game;
    } catch (error) {
      console.error('Ошибка сохранения игры:', error);
      throw error;
    }
  }

  // Создание игрока
  async createPlayer(userId, username, profession) {
    try {
      const player = new Player({
        userId,
        username,
        profession,
        salary: profession.salary,
        expenses: profession.expenses,
        cash: profession.savings,
        passiveIncome: 0,
        totalIncome: profession.salary,
        totalExpenses: profession.expenses,
        cashFlow: profession.salary - profession.expenses,
        assets: [],
        liabilities: [],
        loans: [],
        position: 0,
        inFastTrack: false
      });
      await player.save();
      return player;
    } catch (error) {
      console.error('Ошибка создания игрока:', error);
      throw error;
    }
  }

  // Получение игрока по userId
  async getPlayer(userId) {
    try {
      const player = await Player.findOne({ userId })
        .populate('assets')
        .populate('loans');
      return player;
    } catch (error) {
      console.error('Ошибка получения игрока:', error);
      throw error;
    }
  }

  // Сохранение игрока
  async savePlayer(playerData) {
    try {
      const player = await Player.findOneAndUpdate(
        { userId: playerData.userId },
        playerData,
        { new: true, upsert: true }
      );
      return player;
    } catch (error) {
      console.error('Ошибка сохранения игрока:', error);
      throw error;
    }
  }

  // Создание актива
  async createAsset(assetData) {
    try {
      const asset = new Asset(assetData);
      await asset.save();
      return asset;
    } catch (error) {
      console.error('Ошибка создания актива:', error);
      throw error;
    }
  }

  // Сохранение актива
  async saveAsset(assetData) {
    try {
      const asset = await Asset.findOneAndUpdate(
        { id: assetData.id },
        assetData,
        { new: true, upsert: true }
      );
      return asset;
    } catch (error) {
      console.error('Ошибка сохранения актива:', error);
      throw error;
    }
  }

  // Создание кредита
  async createLoan(loanData) {
    try {
      const loan = new Loan(loanData);
      await loan.save();
      return loan;
    } catch (error) {
      console.error('Ошибка создания кредита:', error);
      throw error;
    }
  }

  // Сохранение кредита
  async saveLoan(loanData) {
    try {
      const loan = await Loan.findOneAndUpdate(
        { id: loanData.id },
        loanData,
        { new: true, upsert: true }
      );
      return loan;
    } catch (error) {
      console.error('Ошибка сохранения кредита:', error);
      throw error;
    }
  }

  // Обновление кредита
  async updateLoan(loanId, updateData) {
    try {
      const loan = await Loan.findByIdAndUpdate(loanId, updateData, { new: true });
      return loan;
    } catch (error) {
      console.error('Ошибка обновления кредита:', error);
      throw error;
    }
  }

  // Удаление игры (при завершении)
  async deleteGame(chatId) {
    try {
      // Получить игру с игроками
      const game = await Game.findOne({ chatId }).populate('players');

      if (game) {
        // Удалить всех игроков и их активы/кредиты
        for (const player of game.players) {
          await Asset.deleteMany({ _id: { $in: player.assets } });
          await Loan.deleteMany({ _id: { $in: player.loans } });
        }
        await Player.deleteMany({ _id: { $in: game.players } });

        // Удалить игру
        await Game.deleteOne({ chatId });
      }
    } catch (error) {
      console.error('Ошибка удаления игры:', error);
      throw error;
    }
  }

  // === СТАТИСТИКА ИГР ===

  // Создание статистики игры
  async createGameStats(gameId, chatId, gameName, players) {
    try {
      const playerStats = players.map(player => ({
        userId: player.userId,
        username: player.username,
        profession: player.profession.name,
        status: 'playing'
      }));

      const gameStats = new GameStats({
        gameId,
        chatId,
        gameName,
        players: playerStats
      });

      await gameStats.save();
      return gameStats;
    } catch (error) {
      console.error('Ошибка создания статистики игры:', error);
      throw error;
    }
  }

  // Обновление статистики игры
  async updateGameStats(gameId, updateData) {
    try {
      const gameStats = await GameStats.findOneAndUpdate(
        { gameId },
        updateData,
        { new: true }
      );
      return gameStats;
    } catch (error) {
      console.error('Ошибка обновления статистики игры:', error);
      throw error;
    }
  }

  // Обновление статистики игрока в игре
  async updatePlayerGameStats(gameId, userId, playerUpdate) {
    try {
      const gameStats = await GameStats.findOne({ gameId });
      if (!gameStats) return null;

      const playerIndex = gameStats.players.findIndex(p => p.userId === userId);
      if (playerIndex === -1) return null;

      Object.assign(gameStats.players[playerIndex], playerUpdate);
      await gameStats.save();

      return gameStats;
    } catch (error) {
      console.error('Ошибка обновления статистики игрока:', error);
      throw error;
    }
  }

  // Завершение игры и сохранение финальной статистики
  async finishGameStats(gameId, winner, duration) {
    try {
      const finishedAt = new Date();
      const updateData = {
        finishedAt,
        duration,
        status: 'finished',
        winner: winner ? {
          userId: winner.userId,
          username: winner.username,
          finalCash: winner.inFastTrack ? winner.fastTrackCash : winner.cash,
          finishedAt
        } : null
      };

      const gameStats = await GameStats.findOneAndUpdate(
        { gameId },
        updateData,
        { new: true }
      );

      return gameStats;
    } catch (error) {
      console.error('Ошибка завершения статистики игры:', error);
      throw error;
    }
  }

  // === СТАТИСТИКА ИГРОКОВ ===

  // Получение или создание статистики игрока
  async getOrCreatePlayerStats(userId, username) {
    try {
      let playerStats = await PlayerStats.findOne({ userId });

      if (!playerStats) {
        playerStats = new PlayerStats({
          userId,
          username,
          lastPlayed: new Date()
        });
        await playerStats.save();
      } else {
        // Обновить имя пользователя если изменилось
        if (playerStats.username !== username) {
          playerStats.username = username;
          await playerStats.save();
        }
      }

      return playerStats;
    } catch (error) {
      console.error('Ошибка получения статистики игрока:', error);
      throw error;
    }
  }

  // Обновление глобальной статистики игрока
  async updatePlayerGlobalStats(userId, gameResult, playersCount) {
    try {
      // Игры с одним игроком не учитываются в статистике
      if (playersCount < 2) {
        return null;
      }

      const playerStats = await PlayerStats.findOne({ userId });
      if (!playerStats) return null;

      // Обновить счетчики игр
      playerStats.gamesPlayed += 1;

      if (gameResult.status === 'won') {
        playerStats.gamesWon += 1;
        if (gameResult.fastTrackEntered) {
          playerStats.fastTrackWins += 1;
        }
      } else if (gameResult.status === 'lost') {
        playerStats.gamesLost += 1;
      } else if (gameResult.status === 'bankrupt') {
        playerStats.gamesBankrupt += 1;
      }

      // Обновить финансовую статистику
      if (gameResult.finalCash > 0) {
        playerStats.totalCashEarned += gameResult.finalCash;
      } else {
        playerStats.totalCashLost += Math.abs(gameResult.finalCash);
      }

      if (gameResult.finalCashFlow > playerStats.bestCashFlow) {
        playerStats.bestCashFlow = gameResult.finalCashFlow;
      }

      // Обновить средний cash flow
      const totalGames = playerStats.gamesPlayed;
      const totalCashFlow = (playerStats.averageCashFlow * (totalGames - 1)) + gameResult.finalCashFlow;
      playerStats.averageCashFlow = totalCashFlow / totalGames;

      // Скоростная дорожка статистика
      if (gameResult.fastTrackEntered) {
        playerStats.fastTrackEntries += 1;
        if (gameResult.fastTrackCash > playerStats.bestFastTrackCash) {
          playerStats.bestFastTrackCash = gameResult.fastTrackCash;
        }
      }

      // Профессии
      const professionIndex = playerStats.professionsPlayed.findIndex(p => p.name === gameResult.profession);
      if (professionIndex >= 0) {
        playerStats.professionsPlayed[professionIndex].count += 1;
      } else {
        playerStats.professionsPlayed.push({
          name: gameResult.profession,
          count: 1
        });
      }

      // Достижения
      if (gameResult.status === 'won' && gameResult.fastTrackCash >= 100000) {
        playerStats.achievements.push({
          name: 'Миллионер',
          description: 'Выиграл игру с капиталом более $100,000 на Скоростная дорожка',
          gameId: gameResult.gameId
        });
      }

      playerStats.lastPlayed = new Date();
      await playerStats.save();

      return playerStats;
    } catch (error) {
      console.error('Ошибка обновления глобальной статистики игрока:', error);
      throw error;
    }
  }

  // Получение топ игроков по различным критериям
  async getTopPlayers(criteria = 'gamesWon', limit = 10) {
    try {
      const sortCriteria = {};
      sortCriteria[criteria] = -1;

      const players = await PlayerStats.find({})
        .sort(sortCriteria)
        .limit(limit)
        .select('username gamesPlayed gamesWon gamesLost totalCashEarned bestCashFlow');

      return players;
    } catch (error) {
      console.error('Ошибка получения топ игроков:', error);
      throw error;
    }
  }

  // Получение статистики конкретного игрока
  async getPlayerStats(userId) {
    try {
      const playerStats = await PlayerStats.findOne({ userId });
      return playerStats;
    } catch (error) {
      console.error('Ошибка получения статистики игрока:', error);
      throw error;
    }
  }

  // Очистка старых завершенных игр
  async cleanupOldGames() {
    try {
      const cutoffDate = new Date(Date.now() - config.cleanupInterval);

      const oldGames = await Game.find({
        gameFinished: true,
        updatedAt: { $lt: cutoffDate }
      });

      for (const game of oldGames) {
        await this.deleteGame(game.chatId);
      }

      console.log(`🧹 Очищено ${oldGames.length} старых игр`);
    } catch (error) {
      console.error('Ошибка очистки старых игр:', error);
    }
  }
}

module.exports = new DatabaseService();
