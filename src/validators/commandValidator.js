/**
 * Сервис валидации команд
 * Проверяет корректность команд и их параметров
 */

class CommandValidator {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  /**
   * Валидация команды /join
   */
  async validateJoin(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Проверяем, что пользователь еще не в игре
    const game = await this.gameManager.getGame(chatId);
    if (game) {
      const existingPlayer = game.players.get(userId);
      if (existingPlayer) {
        return { valid: false, message: "Вы уже в игре!" };
      }

      // Проверяем, что игра не началась
      if (game.gameStarted) {
        return { valid: false, message: "Игра уже началась! Подождите следующей игры." };
      }
    }

    return { valid: true };
  }

  /**
   * Валидация команды /startgame
   */
  async validateStartGame(msg) {
    const chatId = msg.chat.id;

    const game = await this.gameManager.getGame(chatId);
    if (!game) {
      return { valid: false, message: "Сначала присоединитесь к игре: /join" };
    }

    if (game.gameStarted) {
      return { valid: false, message: "Игра уже началась!" };
    }

    if (game.players.size < 1) {
      return { valid: false, message: "Нужно минимум 1 игрок для начала игры!" };
    }

    return { valid: true };
  }

  /**
   * Валидация команды /roll
   */
  async validateRoll(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const game = await this.gameManager.getGame(chatId);
    if (!game) {
      return { valid: false, message: "Игра не найдена. Используйте /join" };
    }

    if (!game.gameStarted) {
      return { valid: false, message: "Игра еще не началась!" };
    }

    if (game.currentPlayerId !== userId) {
      const currentPlayer = game.getCurrentPlayer();
      return { valid: false, message: `Сейчас ход игрока: ${currentPlayer.username}` };
    }

    if (game.waitingForAction) {
      return { valid: false, message: "Завершите текущее действие!" };
    }

    return { valid: true };
  }

  /**
   * Валидация команды /payloan
   */
  async validatePayLoan(msg, match) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const game = await this.gameManager.getGame(chatId);
    if (!game) {
      return { valid: false, message: "Игра не найдена" };
    }

    const player = game.players.get(userId);
    if (!player) {
      return { valid: false, message: "Вы не в игре" };
    }

    const loansInfo = player.getLoansInfo();
    if (loansInfo.loans.length === 0) {
      return { valid: false, message: "У вас нет активных кредитов" };
    }

    // Если указан ID кредита, проверяем его существование
    if (match && match[1]) {
      const parts = match[1].trim().split(' ');
      const loanId = parseInt(parts[0]);

      const loanExists = loansInfo.loans.some(loan => loan.id === loanId);
      if (!loanExists) {
        return { valid: false, message: `Кредит с ID ${loanId} не найден` };
      }

      // Проверяем сумму если указана
      if (parts[1]) {
        const amount = parseInt(parts[1]);
        if (isNaN(amount) || amount <= 0) {
          return { valid: false, message: "Неверная сумма платежа" };
        }

        if (amount > player.cash) {
          return { valid: false, message: `Недостаточно денег! У вас: ₽${player.cash}` };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Валидация команды /sellasset
   */
  async validateSellAsset(msg, match) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const game = await this.gameManager.getGame(chatId);
    if (!game) {
      return { valid: false, message: "Игра не найдена" };
    }

    if (game.currentPlayerId !== userId) {
      return { valid: false, message: "Не ваш ход!" };
    }

    const player = game.getCurrentPlayer();
    if (player.assets.length === 0) {
      return { valid: false, message: "У вас нет активов для продажи" };
    }

    // Если указан индекс актива, проверяем его существование
    if (match && match[1]) {
      const assetIndex = parseInt(match[1]) - 1;
      if (assetIndex < 0 || assetIndex >= player.assets.length) {
        return { valid: false, message: `Актив с номером ${assetIndex + 1} не найден` };
      }
    }

    return { valid: true };
  }

  /**
   * Валидация покупки актива
   */
  async validateBuyAsset(chatId, userId) {
    const game = await this.gameManager.getGame(chatId);
    if (!game) {
      return { valid: false, message: "Игра не найдена" };
    }

    if (game.currentPlayerId !== userId) {
      return { valid: false, message: "Не ваш ход!" };
    }

    if (!game.waitingForAction || !game.currentCard) {
      return { valid: false, message: "Нет активной сделки!" };
    }

    const card = game.currentCard;
    if (card.type !== 'small' && card.type !== 'big') {
      return { valid: false, message: "Это не сделка!" };
    }

    return { valid: true, card };
  }

  /**
   * Валидация оплаты расходов
   */
  async validatePayExpense(chatId, userId, useLoan = false) {
    const game = await this.gameManager.getGame(chatId);
    if (!game) {
      return { valid: false, message: "Игра не найдена" };
    }

    if (game.currentPlayerId !== userId) {
      return { valid: false, message: "Не ваш ход!" };
    }

    if (!game.waitingForAction || !game.currentCard) {
      return { valid: false, message: "Нет активного действия!" };
    }

    const player = game.players.get(userId);
    const card = game.currentCard;

    if (card.type !== 'doodad') {
      return { valid: false, message: "Это не расход!" };
    }

    // Проверяем, достаточно ли денег
    if (player.cash < card.cost) {
      const shortage = card.cost - player.cash;

      if (!useLoan) {
        // Предлагаем варианты оплаты
        return {
          valid: true,
          needsLoan: true,
          shortage,
          canUseLoan: player.cashFlow > Math.ceil(shortage * 0.01),
          canUseCreditCard: player.cashFlow > Math.ceil(shortage * 0.02)
        };
      }
    }

    return { valid: true };
  }

  /**
   * Валидация голосования за кик
   */
  async validateVoteKick(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const game = await this.gameManager.getGame(chatId);
    if (!game) {
      return { valid: false, message: "Игра не найдена" };
    }

    if (game.players.size < 3) {
      return { valid: false, message: "Для голосования нужно минимум 3 игрока" };
    }

    return { valid: true };
  }

  /**
   * Валидация броска кубика на Скоростная дорожка
   */
  async validateFastTrackRoll(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const game = await this.gameManager.getGame(chatId);
    if (!game) {
      return { valid: false, message: "Игра не найдена" };
    }

    if (game.currentPlayerId !== userId) {
      return { valid: false, message: "Не ваш ход!" };
    }

    const player = game.players.get(userId);
    if (!player || !player.inFastTrack) {
      return { valid: false, message: "Вы не на скоростной дорожке!" };
    }

    return { valid: true };
  }

  /**
   * Общая валидация игры
   */
  async validateGameExists(chatId) {
    const game = await this.gameManager.getGame(chatId);
    if (!game) {
      return { valid: false, message: "Игра не найдена. Используйте /join" };
    }
    return { valid: true, game };
  }

  /**
   * Валидация того, что игрок в игре
   */
  validatePlayerInGame(game, userId) {
    const player = game.players.get(userId);
    if (!player) {
      return { valid: false, message: "Вы не в игре. Используйте /join" };
    }
    return { valid: true, player };
  }

  /**
   * Валидация того, что сейчас ход игрока
   */
  validatePlayerTurn(game, userId) {
    if (game.currentPlayerId !== userId) {
      const currentPlayer = game.getCurrentPlayer();
      return { valid: false, message: `Сейчас ход игрока: ${currentPlayer.username}` };
    }
    return { valid: true };
  }

  /**
   * Валидация того, что игра началась
   */
  validateGameStarted(game) {
    if (!game.gameStarted) {
      return { valid: false, message: "Игра еще не началась!" };
    }
    return { valid: true };
  }
}

module.exports = CommandValidator;
