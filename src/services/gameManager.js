const CashFlowGame = require('../game/game');
const dbService = require('./dbService');
const config = require('../config');

class GameManager {
  constructor() {
    this.activeGames = new Map(); // chatId -> CashFlowGame (in-memory cache)
    this.gameStats = new Map(); // gameId -> game stats tracking
  }

  async getGame(chatId) {
    // Сначала проверяем кэш
    if (this.activeGames.has(chatId)) {
      return this.activeGames.get(chatId);
    }

    // Если нет в кэше, загружаем из БД
    const gameData = await dbService.getGame(chatId);
    if (!gameData) {
      return null;
    }

    // Создаем объект CashFlowGame из данных БД
    const game = this.reconstructGameFromData(gameData);
    this.activeGames.set(chatId, game);
    return game;
  }

  async createGame(chatId) {
    // Создаем в БД
    await dbService.createGame(chatId);

    // Создаем объект игры
    const game = new CashFlowGame(chatId);
    this.activeGames.set(chatId, game);
    return game;
  }

  async saveGame(chatId) {
    const game = this.activeGames.get(chatId);
    if (!game) return;

    // Получаем данные игры для сохранения
    const gameData = this.getGameDataForSave(game);

    // Сохраняем игроков отдельно и получаем их ObjectId
    const playerIds = [];
    for (const player of game.players.values()) {
      // Сохраняем активы отдельно и получаем их ObjectId
      const assetIds = [];
      for (const asset of player.assets) {
        const savedAsset = await dbService.saveAsset(asset);
        assetIds.push(savedAsset._id);
      }

      // Сохраняем кредиты отдельно и получаем их ObjectId
      const loanIds = [];
      for (const loan of player.loans) {
        const savedLoan = await dbService.saveLoan(loan);
        loanIds.push(savedLoan._id);
      }

      const savedPlayer = await dbService.savePlayer({
        userId: player.userId,
        username: player.username,
        profession: player.profession,
        salary: player.salary,
        expenses: player.expenses,
        cash: player.cash,
        passiveIncome: player.passiveIncome,
        totalIncome: player.totalIncome,
        totalExpenses: player.totalExpenses,
        cashFlow: player.cashFlow,
        assets: assetIds,
        liabilities: [], // Пока не используется
        loans: loanIds,
        position: player.position,
        inFastTrack: player.inFastTrack,
        fastTrackCash: player.fastTrackCash,
        fastTrackIncome: player.fastTrackIncome,
        fastTrackPosition: player.fastTrackPosition,
        dreamCost: player.dreamCost
      });
      playerIds.push(savedPlayer._id);
    }

    // Обновляем gameData с ObjectId игроков
    gameData.players = playerIds;

    // Сохраняем игру в БД
    await dbService.saveGame(gameData);
  }

  async deleteGame(chatId) {
    // Удаляем из кэша
    this.activeGames.delete(chatId);

    // Удаляем из БД
    await dbService.deleteGame(chatId);
  }

  // Восстанавливаем объект CashFlowGame из данных БД
  reconstructGameFromData(gameData) {
    const game = new CashFlowGame(gameData.chatId);

    // Восстанавливаем простые поля
    game.gameStarted = gameData.gameStarted;
    game.gameFinished = gameData.gameFinished;
    game.currentPlayerId = gameData.currentPlayerId;
    game.currentCard = gameData.currentCard;
    game.waitingForAction = gameData.waitingForAction;

    // Восстанавливаем голосование
    game.kickVotes = new Map();
    if (gameData.kickVotes) {
      for (const [key, value] of gameData.kickVotes) {
        game.kickVotes.set(key, new Set(value));
      }
    }

    // Восстанавливаем игроков
    game.players = new Map();
    if (gameData.players && gameData.players.length > 0) {
      for (const playerData of gameData.players) {
        const player = this.reconstructPlayerFromData(playerData);
        game.players.set(player.userId, player);
      }
    }

    return game;
  }

  // Восстанавливаем объект Player из данных БД
  reconstructPlayerFromData(playerData) {
    const Player = require('../game/player');
    const player = new Player(playerData.userId, playerData.username, playerData.profession);

    // Восстанавливаем поля
    player.salary = playerData.salary;
    player.expenses = playerData.expenses;
    player.cash = playerData.cash;
    player.passiveIncome = playerData.passiveIncome;
    player.totalIncome = playerData.totalIncome;
    player.totalExpenses = playerData.totalExpenses;
    player.cashFlow = playerData.cashFlow;
    player.position = playerData.position;
    player.inFastTrack = playerData.inFastTrack;
    player.fastTrackCash = playerData.fastTrackCash || 0;
    player.fastTrackIncome = playerData.fastTrackIncome || 0;
    player.fastTrackPosition = playerData.fastTrackPosition || 0;
    player.dreamCost = playerData.dreamCost || 0;

    // Восстанавливаем активы (преобразуем из populate данных)
    player.assets = (playerData.assets || []).map(asset => ({
      id: asset.id,
      title: asset.title,
      cost: asset.cost,
      downPayment: asset.downPayment,
      passiveIncome: asset.passiveIncome,
      type: asset.type,
      loanId: asset.loanId
    }));

    // Восстанавливаем кредиты (преобразуем из populate данных)
    player.loans = (playerData.loans || []).map(loan => ({
      id: loan.id,
      type: loan.type,
      amount: loan.amount,
      remainingAmount: loan.remainingAmount,
      monthlyPayment: loan.monthlyPayment,
      assetTitle: loan.assetTitle,
      createdAt: loan.createdAt
    }));

    return player;
  }

  // Получаем данные игры для сохранения в БД (игроки сохраняются отдельно)
  getGameDataForSave(game) {
    // Преобразуем Map kickVotes в объект
    const kickVotes = {};
    for (const [key, value] of game.kickVotes) {
      kickVotes[key] = Array.from(value);
    }

    return {
      chatId: game.chatId,
      currentPlayerId: game.currentPlayerId,
      gameStarted: game.gameStarted,
      gameFinished: game.gameFinished,
      currentCard: game.currentCard,
      waitingForAction: game.waitingForAction,
      winner: game.winner ? game.winner.userId : null,
      loser: game.loser ? game.loser.userId : null,
      kickVotes: kickVotes
    };
  }

  // === СТАТИСТИКА ===

  // Инициализация статистики игры
  async initializeGameStats(chatId, gameName = 'CashFlow Game') {
    const game = this.activeGames.get(chatId);
    if (!game || !game.gameStarted) return;

    const gameId = `game_${chatId}_${Date.now()}`;
    const players = Array.from(game.players.values());

    // Создаем статистику игры
    await dbService.createGameStats(gameId, chatId, gameName, players);

    // Инициализируем отслеживание статистики
    this.gameStats.set(chatId, {
      gameId,
      playerMoves: new Map(),
      playerBalances: new Map(),
      fastTrackEntries: new Map(),
      startTime: new Date()
    });

    return gameId;
  }

  // Обновление статистики хода игрока
  async updatePlayerMove(chatId, userId) {
    const gameStats = this.gameStats.get(chatId);
    if (!gameStats) return;

    const currentMoves = gameStats.playerMoves.get(userId) || 0;
    gameStats.playerMoves.set(userId, currentMoves + 1);

    // Обновляем статистику в БД
    await dbService.updatePlayerGameStats(gameStats.gameId, userId, {
      movesCount: currentMoves + 1
    });
  }

  // Обновление баланса игрока
  async updatePlayerBalance(chatId, userId, cash, cashFlow) {
    const gameStats = this.gameStats.get(chatId);
    if (!gameStats) return;

    gameStats.playerBalances.set(userId, { cash, cashFlow });

    // Обновляем статистику в БД
    await dbService.updatePlayerGameStats(gameStats.gameId, userId, {
      finalCash: cash,
      finalCashFlow: cashFlow
    });
  }

  // Регистрация выхода на Скоростная дорожка
  async registerFastTrackEntry(chatId, userId, position, cash) {
    const gameStats = this.gameStats.get(chatId);
    if (!gameStats) return;

    gameStats.fastTrackEntries.set(userId, { position, cash, enteredAt: new Date() });

    // Обновляем статистику в БД
    await dbService.updatePlayerGameStats(gameStats.gameId, userId, {
      fastTrackEntered: true,
      fastTrackPosition: position,
      fastTrackCash: cash
    });
  }

  // Завершение игры и сохранение финальной статистики
  async finishGameStats(chatId) {
    const gameStats = this.gameStats.get(chatId);
    const game = this.activeGames.get(chatId);

    if (!gameStats || !game) return;

    const duration = Math.floor((new Date() - gameStats.startTime) / (1000 * 60)); // в минутах
    const winner = game.winner;
    const playersCount = game.players.size;

    // Финализируем статистику игры
    await dbService.finishGameStats(gameStats.gameId, winner, duration);

    // Обновляем глобальную статистику игроков (только для игр с 2+ игроками)
    if (playersCount >= 2) {
      for (const player of game.players.values()) {
        const playerResult = {
          gameId: gameStats.gameId,
          status: player === winner ? 'won' : (player.cash <= 0 ? 'bankrupt' : 'lost'),
          finalCash: player.inFastTrack ? player.fastTrackCash : player.cash,
          finalCashFlow: player.cashFlow,
          profession: player.profession.name,
          fastTrackEntered: player.inFastTrack,
          fastTrackCash: player.fastTrackCash || 0
        };

        await dbService.updatePlayerGlobalStats(player.userId, playerResult, playersCount);
      }
    }

    // Очищаем локальную статистику
    this.gameStats.delete(chatId);
  }

  // Получение статистики игрока
  async getPlayerStats(userId) {
    return await dbService.getPlayerStats(userId);
  }

  // Получение топ игроков
  async getTopPlayers(criteria = 'gamesWon', limit = 10) {
    return await dbService.getTopPlayers(criteria, limit);
  }

  // Сохраняем игру после каждого изменения
  async saveGameAfterAction(chatId) {
    await this.saveGame(chatId);
  }
}

module.exports = new GameManager();
