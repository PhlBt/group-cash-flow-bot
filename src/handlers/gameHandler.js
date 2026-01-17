/**
 * Обработчики игровых команд
 */
const { formatNumber } = require('../utils/formatters');

class GameHandler {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  /**
   * Обработка команды /join
   */
  async handleJoin(msg, sendMessage, formatPlayerInfo, getJoinSuccessKeyboard) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.first_name || msg.from.username || 'Игрок';

    let game = await this.gameManager.getGame(chatId);
    if (!game) {
      game = await this.gameManager.createGame(chatId);
    }

    const result = game.addPlayer(userId, username);

    await sendMessage(chatId, result.message);

    if (result.success) {
      await this.gameManager.saveGame(chatId);
      await sendMessage(chatId, formatPlayerInfo(result.player));
      const keyboard = getJoinSuccessKeyboard(game.gameStarted);
      await sendMessage(chatId, `Выберите действие:`, { reply_markup: keyboard });
    }
  }

  /**
   * Обработка команды /startgame
   */
  async handleStartGame(msg, sendMessage, formatPlayerInfo, getGameActionsKeyboard, getJoinSuccessKeyboard) {
    const chatId = msg.chat.id;

    const game = await this.gameManager.getGame(chatId);
    if (!game) {
      return await sendMessage(chatId, "Сначала присоединитесь к игре: /join", { reply_markup: getStartInlineKeyboard() });
    }

    const result = game.startGame();

    if (result.success) {
      await this.gameManager.saveGame(chatId);

      // Инициализируем статистику игры (только для игр с 2+ игроками)
      if (game.players.size >= 2) {
        await this.gameManager.initializeGameStats(chatId);
      } else {
        await sendMessage(chatId, "⚠️ Одиночные игры не учитываются в статистике и рейтингах");
      }

      const currentPlayer = game.getCurrentPlayer();
      await sendMessage(chatId, `${result.message}\n\nХод игрока: ${currentPlayer.username}`);
      await sendMessage(chatId, formatPlayerInfo(currentPlayer.getStatus()));
      await sendMessage(chatId, `Ваш ход ${currentPlayer.username}! Бросьте кубик:`, { reply_markup: getGameActionsKeyboard() });
    } else {
      await sendMessage(chatId, result.message);
    }
  }

  /**
   * Обработка команды /status
   */
  async handleStatus(msg, sendMessage, getGameActionsKeyboard, getJoinSuccessKeyboard) {
    const chatId = msg.chat.id;

    const game = await this.gameManager.getGame(chatId);
    if (!game) {
      return await sendMessage(chatId, "Игра не найдена. Используйте /join", { reply_markup: getStartInlineKeyboard() });
    }

    const status = game.getStatus();

    let message = `📊 СТАТУС ИГРЫ\n\n`;
    message += `Игра: ${status.gameStarted ? 'В процессе' : 'Не начата'}\n`;

    if (status.currentPlayer) {
      const currentPlayer = game.getCurrentPlayer();
      message += `Текущий ход: ${currentPlayer.username}\n\n`;
    }

    message += `Игроки:\n`;
    status.players.forEach((player, index) => {
      message += `\n${index + 1}. ${player.username} (${player.profession})\n`;
      message += `   💰 Деньги: ${formatNumber(player.cash)} ₽\n`;
      message += `   📊 Денежный поток: ${formatNumber(player.cashFlow)} ₽/месяц\n`;
      message += `   📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/месяц\n`;
      message += `   🏠 Активы: ${player.assetsCount}\n`;
      if (player.loansCount && player.loansCount > 0) {
        message += `   💳 Кредитов: ${player.loansCount} (${formatNumber(player.totalLoans)} ₽)\n`;
      }
      if (player.inFastTrack) {
        message += `   ⚡ На быстром треке!\n`;
      }
    });

    const keyboard = status.gameStarted ? getGameActionsKeyboard() : getJoinSuccessKeyboard(false);
    await sendMessage(chatId, message, { reply_markup: keyboard });
  }

  /**
   * Обработка команды /roll
   */
  async handleRoll(msg, sendMessage, getStartInlineKeyboard) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const game = await this.gameManager.getGame(chatId);
    if (!game) {
      return await sendMessage(chatId, "Игра не найдена. Используйте /join", { reply_markup: getStartInlineKeyboard() });
    }

    if (game.currentPlayerId !== userId) {
      const currentPlayer = game.getCurrentPlayer();
      return await sendMessage(chatId, `Сейчас ход игрока: ${currentPlayer.username}`);
    }

    // Обновляем статистику хода игрока
    await this.gameManager.updatePlayerMove(chatId, userId);

    const result = game.rollDice();

    if (result.success) {
      await this.gameManager.saveGame(chatId);

      // Обновляем баланс игрока
      const player = game.players.get(userId);
      await this.gameManager.updatePlayerBalance(chatId, userId, player.cash, player.cashFlow);

      await sendMessage(chatId, result.message);

      if (game.gameFinished) {
        await sendMessage(chatId, "🎉 ИГРА ЗАВЕРШЕНА! Победитель вышел из крысиных бегов!");
        await this.gameManager.finishGameStats(chatId);
        await this.gameManager.deleteGame(chatId);
      }
    } else {
      await sendMessage(chatId, result.message);
    }
  }

  /**
   * Обработка команды /endgame
   */
  async handleEndGame(msg, sendMessage) {
    const chatId = msg.chat.id;

    const game = await this.gameManager.getGame(chatId);
    if (game) {
      await this.gameManager.deleteGame(chatId);
      await sendMessage(chatId, "Игра завершена");
    } else {
      await sendMessage(chatId, "Игра не найдена");
    }
  }
}

module.exports = GameHandler;
