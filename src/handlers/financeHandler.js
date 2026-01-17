/**
 * Обработчики финансовых команд
 */

class FinanceHandler {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  /**
   * Обработка команды /loans
   */
  async handleLoans(msg, sendMessage, getLoansKeyboard) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const game = await this.gameManager.getGame(chatId);
    if (!game) {
      return await sendMessage(chatId, "Игра не найдена. Используйте /join");
    }

    const player = game.players.get(userId);

    if (!player) {
      return await sendMessage(chatId, "Вы не в игре. Используйте /join");
    }

    const loansInfo = player.getLoansInfo();

    if (loansInfo.loans.length === 0) {
      await sendMessage(chatId, "💳 У вас нет активных кредитов");
      return;
    }

    let message = `💳 ВАШИ КРЕДИТЫ:\n\n`;
    loansInfo.loans.forEach((loan, index) => {
      message += `${index + 1}. ${loan.assetTitle || 'Кредит'}\n`;
      message += `   💰 Сумма: $${loan.amount}\n`;
      message += `   📉 Остаток: $${loan.remainingAmount}\n`;
      message += `   💸 Ежемесячный платеж: $${loan.monthlyPayment}\n\n`;
    });

    message += `📊 Общая сумма кредитов: $${loansInfo.totalAmount}\n`;
    message += `💸 Общие ежемесячные платежи: $${loansInfo.totalPayments}`;

    await sendMessage(chatId, message, { reply_markup: getLoansKeyboard(loansInfo.loans) });
  }

  /**
   * Обработка команды /payloan
   */
  async handlePayLoan(msg, match, sendMessage) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const game = await this.gameManager.getGame(chatId);
    if (!game) {
      return await sendMessage(chatId, "Игра не найдена");
    }

    const player = game.players.get(userId);

    if (!player) {
      return await sendMessage(chatId, "Вы не в игре");
    }

    const loansInfo = player.getLoansInfo();

    if (loansInfo.loans.length === 0) {
      return await sendMessage(chatId, "У вас нет активных кредитов");
    }

    // Если указан ID кредита и сумма
    if (match && match[1]) {
      const parts = match[1].trim().split(' ');
      const loanId = parseInt(parts[0]);
      const amount = parts[1] ? parseInt(parts[1]) : null;

      const result = player.payLoan(loanId, amount);
      await sendMessage(chatId, result.message);
      await this.gameManager.saveGame(chatId);
    } else {
      // Показываем список кредитов для погашения
      let message = `💳 Выберите кредит для погашения:\n\n`;
      loansInfo.loans.forEach((loan, index) => {
        message += `${index + 1}. Остаток: $${loan.remainingAmount}, Платеж: $${loan.monthlyPayment}/мес\n`;
      });
      message += `\nИспользуйте: /payloan <номер> [сумма]\n`;
      message += `Например: /payloan 1 1000 (погасить 1000 из кредита #1)\n`;
      message += `Или: /payloan 1 (погасить кредит #1 полностью)`;

      await sendMessage(chatId, message, { reply_markup: getLoansKeyboard(loansInfo.loans) });
    }
  }

  /**
   * Обработка просмотра активов (cmd_viewassets)
   */
  async handleViewAssets(query, sendMessage, getSellAssetKeyboard) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;
    const page = data.startsWith('assets_page_') ? parseInt(data.split('_')[2]) : 0;

    const game = await this.gameManager.getGame(chatId);
    if (!game) {
      return await sendMessage(chatId, "Игра не найдена");
    }

    if (game.currentPlayerId !== userId) {
      return await sendMessage(chatId, "Не ваш ход!");
    }

    const player = game.getCurrentPlayer();

    // Показываем список активов
    if (player.assets.length === 0) {
      return await sendMessage(chatId, "У вас нет активов для продажи");
    }

    const ITEMS_PER_PAGE = 5;
    const startIndex = page * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, player.assets.length);
    const currentAssets = player.assets.slice(startIndex, endIndex);

    let message = `📦 Ваши активы (страница ${page + 1})\n\n`;
    currentAssets.forEach((a, i) => {
      const globalIndex = startIndex + i + 1;
      const salePrice = Math.floor(a.cost * 0.8);
      message += `${globalIndex}. ${a.title}\n`;
      message += `   💰 Стоимость: $${a.cost}\n`;
      message += `   💵 Цена продажи: $${salePrice} (80%)\n`;
      message += `   📈 Доход: $${a.passiveIncome}/мес\n\n`;
    });

    if (player.assets.length > ITEMS_PER_PAGE) {
      const totalPages = Math.ceil(player.assets.length / ITEMS_PER_PAGE);
      message += `📄 Страница ${page + 1} из ${totalPages}\n\n`;
    }

    return await sendMessage(chatId, message, { reply_markup: getSellAssetKeyboard(player.assets, page, true) });
  }

  /**
   * Обработка просмотра кредитов (cmd_loans)
   */
  async handleViewLoans(query, sendMessage, getLoansKeyboard) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;
    const page = data.startsWith('loans_page_') ? parseInt(data.split('_')[2]) : 0;

    const game = await this.gameManager.getGame(chatId);
    if (!game) {
      return await sendMessage(chatId, "Игра не найдена. Используйте /join");
    }

    const player = game.players.get(userId);

    if (!player) {
      return await sendMessage(chatId, "Вы не в игре. Используйте /join");
    }

    const loansInfo = player.getLoansInfo();

    if (loansInfo.loans.length === 0) {
      await sendMessage(chatId, "💳 У вас нет активных кредитов");
      return;
    }

    const ITEMS_PER_PAGE = 5;
    const startIndex = page * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, loansInfo.loans.length);
    const currentLoans = loansInfo.loans.slice(startIndex, endIndex);

    let message = `💳 ВАШИ КРЕДИТЫ (страница ${page + 1})\n\n`;
    currentLoans.forEach((loan, index) => {
      const globalIndex = startIndex + index + 1;
      message += `${globalIndex}. ${loan.assetTitle || 'Кредит'}\n`;
      message += `   💰 Сумма: $${loan.amount}\n`;
      message += `   📉 Остаток: $${loan.remainingAmount}\n`;
      message += `   💸 Ежемесячный платеж: $${loan.monthlyPayment}\n\n`;
    });

    if (loansInfo.loans.length > ITEMS_PER_PAGE) {
      const totalPages = Math.ceil(loansInfo.loans.length / ITEMS_PER_PAGE);
      message += `📄 Страница ${page + 1} из ${totalPages}\n\n`;
    }

    message += `📊 Общая сумма кредитов: $${loansInfo.totalAmount}\n`;
    message += `💸 Общие ежемесячные платежи: $${loansInfo.totalPayments}`;

    await sendMessage(chatId, message, { reply_markup: getLoansKeyboard(loansInfo.loans, page) });
  }
}

module.exports = FinanceHandler;
