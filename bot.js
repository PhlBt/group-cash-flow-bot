const TelegramBot = require('node-telegram-bot-api');
const CashFlowGame = require('./game');

// Замените на ваш токен от @BotFather
const TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';


const bot = new TelegramBot(TOKEN, { polling: true });

// Хранилище игр по chatId
const games = new Map();

// Очередь сообщений для синхронизации отправки
class MessageQueue {
  constructor() {
    this.queues = new Map(); // chatId -> Promise
  }

  async send(chatId, text, options = {}) {
    // Если очередь для этого чата не существует, создаем промис, который сразу выполняется
    if (!this.queues.has(chatId)) {
      this.queues.set(chatId, Promise.resolve());
    }

    // Добавляем новое сообщение в очередь
    const previousPromise = this.queues.get(chatId);
    const newPromise = previousPromise
      .then(() => bot.sendMessage(chatId, text, options))
      .catch(err => {
        console.error(`Ошибка отправки сообщения в чат ${chatId}:`, err);
        // Продолжаем выполнение очереди даже при ошибке
        return null;
      });

    this.queues.set(chatId, newPromise);
    return newPromise;
  }

  async sendMultiple(chatId, messages) {
    for (const msg of messages) {
      await this.send(chatId, msg.text, msg.options);
    }
  }
}

const messageQueue = new MessageQueue();

// Обертка для отправки сообщений через очередь
async function sendMessage(chatId, text, options = {}) {
  return messageQueue.send(chatId, text, options);
}

// Команда /start
bot.onText(/^\/start(@[a-zA-Z0-9]+)?$/, async (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
🎮 Добро пожаловать в CashFlow!

Правила игры:
🎯 Цель: Выйти из "крысиных бегов", накопив пассивный доход больше расходов

Используйте кнопки ниже или команды для управления игрой.
  `;
  await sendMessage(chatId, welcomeMessage, { reply_markup: getStartInlineKeyboard() });
});

// Команда /help
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
📖 Справка по командам:

/join - Присоединиться к игре
/startgame - Начать игру (после того как все присоединились)
/roll - Бросить кубик (ваш ход)
/status - Посмотреть статус всех игроков
/myinfo - Ваша детальная информация
/rules - Правила игры
/votekick - Голосовать за исключение игрока
/endgame - Завершить игру
  `;
  await sendMessage(chatId, helpMessage);
});

// Команда /rules
bot.onText(/\/rules/, async (msg) => {
  const chatId = msg.chat.id;
  const rulesMessage = `
📚 ПРАВИЛА ИГРЫ CASHFLOW

🎯 ЦЕЛЬ ИГРЫ:
Выйти из "крысиных бегов", накопив пассивный доход, который превышает ваши расходы.

📋 ОСНОВНЫЕ ПРАВИЛА:

1️⃣ НАЧАЛО ИГРЫ
• Используйте /join для присоединения к игре
• После присоединения всех игроков используйте /startgame
• Каждый игрок получает случайную профессию с зарплатой, расходами и начальными сбережениями

2️⃣ ХОД ИГРЫ
• Игроки ходят по очереди
• Бросьте кубик командой /roll
• В зависимости от клетки, на которую вы попали, происходят разные события

3️⃣ ТИПЫ КЛЕТОК:
• 🎯 МАЛАЯ СДЕЛКА - небольшие инвестиции (акции, квартиры)
• 💼 БОЛЬШАЯ СДЕЛКА - крупные инвестиции (бизнес, недвижимость)
• 📈 РЫНОК - события рынка (рост/падение цен, бонусы)
• 🎁 ВОЗМОЖНОСТЬ - специальные возможности
• 💸 РАСХОДЫ - непредвиденные траты (обязательны к оплате)
• 💰 ДЕНЬ ЗАРПЛАТЫ - получение зарплаты и расчет месячного баланса

4️⃣ МЕСЯЧНЫЙ БАЛАНС
В конце каждого месяца (при прохождении полного круга или попадании на день зарплаты):
• ➕ Вы получаете зарплату
• ➕ Вы получаете пассивный доход от всех активов
• ➖ Вы оплачиваете все расходы (базовые + от пассивов)

5️⃣ АКТИВЫ И ПАССИВНЫЙ ДОХОД
• Активы приносят пассивный доход каждый месяц
• Пассивный доход добавляется к вашему балансу автоматически
• Активы можно покупать за наличные или с помощью кредита

6️⃣ КРЕДИТОВАНИЕ
• Если у вас недостаточно денег для покупки актива, можно взять кредит
• Процентная ставка: 1% в месяц (≈12% годовых)
• Ежемесячные платежи по кредитам автоматически вычитаются из баланса
• Кредиты можно погасить досрочно командой /payloan

7️⃣ ДЕНЕЖНЫЙ ПОТОК
• Денежный поток = Общий доход - Общие расходы
• Общий доход = Зарплата + Пассивный доход
• Общие расходы = Базовые расходы + Платежи по кредитам + Расходы от пассивов

8️⃣ ПОБЕДА
🎉 Вы выходите из "крысиных бегов", когда:
   Пассивный доход > Общие расходы

💡 СТРАТЕГИЯ:
• Покупайте активы, которые приносят пассивный доход
• Управляйте кредитами разумно
• Стремитесь увеличить пассивный доход быстрее, чем растут расходы
• Используйте возможности рынка для увеличения дохода

📊 КОМАНДЫ:
• /status - посмотреть статус всех игроков
• /myinfo - ваша детальная информация
• /loans - ваши кредиты
• /help - справка по командам
  `;
  await sendMessage(chatId, rulesMessage);
});

// Команда /join
bot.onText(/\/join/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.first_name || msg.from.username || 'Игрок';

  if (!games.has(chatId)) {
    games.set(chatId, new CashFlowGame(chatId));
  }

  const game = games.get(chatId);
  const result = game.addPlayer(userId, username);

  await sendMessage(chatId, result.message);

  if (result.success) {
    await sendMessage(chatId, formatPlayerInfo(result.player));
    const keyboard = getJoinSuccessKeyboard(game.gameStarted);
    await sendMessage(chatId, `Выберите действие:`, { reply_markup: keyboard });
  }
});

// Команда /startgame
bot.onText(/\/startgame/, async (msg) => {
  const chatId = msg.chat.id;

  if (!games.has(chatId)) {
    return await sendMessage(chatId, "Сначала присоединитесь к игре: /join", { reply_markup: getStartInlineKeyboard() });
  }

  const game = games.get(chatId);
  const result = game.startGame();

  if (result.success) {
    const currentPlayer = game.getCurrentPlayer();
    await sendMessage(chatId, `${result.message}\n\nХод игрока: ${currentPlayer.username}`);
    await sendMessage(chatId, formatPlayerInfo(currentPlayer.getStatus()));
    await sendMessage(chatId, `Ваш ход ${currentPlayer.username}! Бросьте кубик:`, { reply_markup: getGameActionsKeyboard() });
  } else {
    await sendMessage(chatId, result.message);
  }
});

// Команда /roll
bot.onText(/\/roll/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!games.has(chatId)) {
    return await sendMessage(chatId, "Игра не найдена. Используйте /join", { reply_markup: getStartInlineKeyboard() });
  }

  const game = games.get(chatId);

  if (game.currentPlayerId !== userId) {
    const currentPlayer = game.getCurrentPlayer();
    return await sendMessage(chatId, `Сейчас ход игрока: ${currentPlayer.username}`);
  }

  const result = game.rollDice();

  if (result.success) {
    await sendMessage(chatId, result.message);

    console.log('result.card', result.card);

    if (result.card && !result.card.skip) {
      const keyboard = getCardKeyboard(result.card.type);
      await sendMessage(chatId, `${player.username} выберите действие:`, { reply_markup: keyboard });
    }

    if (game.gameFinished) {
      await sendMessage(chatId, "🎉 ИГРА ЗАВЕРШЕНА! Победитель вышел из крысиных бегов!");
    } else if (!result.card || result.card.skip) {
      // Если нет карты, показываем кнопки для следующего хода
      const nextPlayer = game.getCurrentPlayer();
      await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
    }
  } else {
    await sendMessage(chatId, result.message);
  }
});

// Команда /buy
bot.onText(/\/buy/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!games.has(chatId)) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  const game = games.get(chatId);

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.buyAsset();
  console.log('buy result', result);
  // await sendMessage(chatId, result.message);

  if (result.success) {
    if (!game.gameFinished) {
      const nextPlayer = game.getCurrentPlayer();
      await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
    }
  } else if (result.canUseLoan) {
    // Предлагаем взять кредит
    const keyboard = {
      inline_keyboard: [
        [
          { text: '💳 Купить с кредитом', callback_data: 'buywithloan' },
          { text: '❌ Отмена', callback_data: 'skip' }
        ]
      ]
    };
    await sendMessage(chatId, result.message, { reply_markup: keyboard });
  }
});

// Команда /buywithloan
bot.onText(/\/buywithloan/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!games.has(chatId)) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  const game = games.get(chatId);

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.buyAsset(true); // Используем кредит
  console.log('2 buy result', result);
  await sendMessage(chatId, result.message);

  if (result.success) {
    if (!game.gameFinished) {
      const nextPlayer = game.getCurrentPlayer();
      await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
    }
  }
});

// Команда /skip
bot.onText(/\/skip/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!games.has(chatId)) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  const game = games.get(chatId);

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.skipDeal();
  await sendMessage(chatId, result.message);

  const nextPlayer = game.getCurrentPlayer();
  await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
});

// Команда /pay
bot.onText(/\/pay/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!games.has(chatId)) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  const game = games.get(chatId);

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.payExpense();

  const inline_keyboard = result.canUseLoan
    ? [{ text: '💳 С кредитом', callback_data: 'paywithloan' }]
    : []

  await sendMessage(chatId, result.message, { reply_markup: inline_keyboard });

  const nextPlayer = game.getCurrentPlayer();
  await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
});

// Команда /status
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;

  if (!games.has(chatId)) {
    return await sendMessage(chatId, "Игра не найдена. Используйте /join", { reply_markup: getStartInlineKeyboard() });
  }

  const game = games.get(chatId);
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
    message += `   💰 Деньги: $${player.cash}\n`;
    message += `   📊 Денежный поток: $${player.cashFlow}/месяц\n`;
    message += `   📈 Пассивный доход: $${player.passiveIncome}/месяц\n`;
    message += `   🏠 Активы: ${player.assetsCount}\n`;
    if (player.loansCount && player.loansCount > 0) {
      message += `   💳 Кредитов: ${player.loansCount} ($${player.totalLoans})\n`;
    }
    if (player.inFastTrack) {
      message += `   ⚡ На быстром треке!\n`;
    }
  });

  const keyboard = status.gameStarted ? getGameActionsKeyboard() : getJoinSuccessKeyboard(false);
  await sendMessage(chatId, message, { reply_markup: keyboard });
});

// Команда /myinfo
bot.onText(/\/myinfo/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!games.has(chatId)) {
    return await sendMessage(chatId, "Игра не найдена. Используйте /join");
  }

  const game = games.get(chatId);
  const player = game.players.get(userId);

  if (!player) {
    return await sendMessage(chatId, "Вы не в игре. Используйте /join");
  }

  await sendMessage(chatId, formatPlayerInfo(player.getStatus()));
});

// Команда /loans - просмотр кредитов
bot.onText(/\/loans/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!games.has(chatId)) {
    return await sendMessage(chatId, "Игра не найдена. Используйте /join");
  }

  const game = games.get(chatId);
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
});

// Команда /payloan - погашение кредита
bot.onText(/\/payloan(?: (.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!games.has(chatId)) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  const game = games.get(chatId);
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
});

// Команда /paywithloan - оплата расхода с кредитом
bot.onText(/\/paywithloan/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!games.has(chatId)) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  const game = games.get(chatId);

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.payExpense(true);
  await sendMessage(chatId, result.message);

  if (result.success && !result.bankrupt) {
    const nextPlayer = game.getCurrentPlayer();
    await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
  } else if (result.bankrupt && game.gameFinished) {
    // Игра завершена
  } else if (result.needSellAsset) {
    await sendMessage(chatId, "Продайте актив командой /sellasset <номер>");
  }
});

// Команда /sellasset - продажа актива
bot.onText(/\/sellasset(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!games.has(chatId)) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  const game = games.get(chatId);

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const player = game.getCurrentPlayer();

  if (!match || !match[1]) {
    // Показываем список активов
    if (player.assets.length === 0) {
      return await sendMessage(chatId, "У вас нет активов для продажи");
    }

    let message = "📦 Ваши активы:\n\n";
    player.assets.forEach((a, i) => {
      const salePrice = Math.floor(a.cost * 0.8);
      message += `${i + 1}. ${a.title}\n`;
      message += `   💰 Стоимость: $${a.cost}\n`;
      message += `   💵 Цена продажи: $${salePrice} (80%)\n`;
      message += `   📈 Доход: $${a.passiveIncome}/мес\n\n`;
    });

    return await sendMessage(chatId, message, { reply_markup: getSellAssetKeyboard(player.assets) });
  }

  const assetIndex = parseInt(match[1]) - 1;
  const result = game.sellAsset(assetIndex);
  await sendMessage(chatId, result.message);

  // Если был расход, проверяем можно ли теперь оплатить
  if (result.success && game.currentCard && game.currentCard.type === 'doodad') {
    await sendMessage(chatId, `💸 Нужно оплатить: $${game.currentCard.cost}\n💰 У вас: $${player.cash}\n\nИспользуйте /pay для оплаты`);
  }
});

// Команда /votekick - голосование за исключение игрока
bot.onText(/\/votekick/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!games.has(chatId)) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  const game = games.get(chatId);

  if (game.players.size < 3) {
    return await sendMessage(chatId, "Для голосования нужно минимум 3 игрока");
  }

  // Показываем список игроков для кика
  const players = Array.from(game.players.values()).filter(p => p.userId !== userId);

  if (players.length === 0) {
    return await sendMessage(chatId, "Нет игроков для исключения");
  }

  const keyboard = {
    inline_keyboard: players.map(p => {
      const voteStatus = game.getKickVoteStatus(p.userId);
      return [{
        text: `🗳️ ${p.username} (${voteStatus.votes}/${voteStatus.needed})`,
        callback_data: `votekick_${p.userId}`
      }];
    })
  };

  await sendMessage(chatId, "Выберите игрока для голосования за исключение:", { reply_markup: keyboard });
});

// Команда /fastroll - бросок на Fast Track
bot.onText(/\/fastroll/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!games.has(chatId)) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  const game = games.get(chatId);

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.rollDiceFastTrack();
  await sendMessage(chatId, result.message);

  if (result.success && !game.gameFinished) {
    await sendMessage(chatId, `${player.username} выберите действие:`, { reply_markup: getFastTrackKeyboard() });
  }

  if (game.gameFinished) {
    const winner = game.getWinner();
    await sendMessage(chatId, `🏆 ПОБЕДИТЕЛЬ: ${winner.username}\n💰 Финальный капитал: $${winner.finalCash}`);
  }
});

// Команда /fastaccept - принять событие Fast Track
bot.onText(/\/fastaccept/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!games.has(chatId)) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  const game = games.get(chatId);

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.processFastTrackEvent(true);
  await sendMessage(chatId, result.message);

  if (game.gameFinished) {
    const winner = game.getWinner();
    await sendMessage(chatId, `🏆 ПОБЕДИТЕЛЬ: ${winner.username}\n💰 Финальный капитал: $${winner.finalCash}`);
  } else if (result.extraTurn) {
    await sendMessage(chatId, "🎲 У вас дополнительный ход!", { reply_markup: getFastTrackRollKeyboard() });
  } else {
    const nextPlayer = game.getCurrentPlayer();
    await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
  }
});

// Команда /fastskip - пропустить событие Fast Track
bot.onText(/\/fastskip/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!games.has(chatId)) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  const game = games.get(chatId);

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.processFastTrackEvent(false);
  await sendMessage(chatId, result.message);

  if (!game.gameFinished) {
    const nextPlayer = game.getCurrentPlayer();
    await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
  }
});

// Команда /endgame
bot.onText(/\/endgame/, async (msg) => {
  const chatId = msg.chat.id;

  if (games.has(chatId)) {
    games.delete(chatId);
    // Очищаем очередь сообщений для этого чата
    messageQueue.queues.delete(chatId);
    await sendMessage(chatId, "Игра завершена");
  } else {
    await sendMessage(chatId, "Игра не найдена");
  }
});

// Обработка callback кнопок
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  bot.answerCallbackQuery(query.id);

  // Обработка команд через кнопки
  if (data === 'cmd_sellasset') {
    if (!games.has(chatId)) {
      return await sendMessage(chatId, "Игра не найдена");
    }

    const game = games.get(chatId);

    if (game.currentPlayerId !== userId) {
      return await sendMessage(chatId, "Не ваш ход!");
    }

    const player = game.getCurrentPlayer();

    // Показываем список активов
    if (player.assets.length === 0) {
      return await sendMessage(chatId, "У вас нет активов для продажи");
    }

    let message = "📦 Ваши активы:\n\n";
    player.assets.forEach((a, i) => {
      const salePrice = Math.floor(a.cost * 0.8);
      message += `${i + 1}. ${a.title}\n`;
      message += `   💰 Стоимость: $${a.cost}\n`;
      message += `   💵 Цена продажи: $${salePrice} (80%)\n`;
      message += `   📈 Доход: $${a.passiveIncome}/мес\n\n`;
    });

    return await sendMessage(chatId, message, { reply_markup: getSellAssetKeyboard(player.assets) });
  } else if (data === 'cmd_loans') {
    if (!games.has(chatId)) {
      return await sendMessage(chatId, "Игра не найдена. Используйте /join");
    }

    const game = games.get(chatId);
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
  } else if (data === 'cmd_join') {
    const username = query.from.first_name || query.from.username || 'Игрок';
    if (!games.has(chatId)) {
      games.set(chatId, new CashFlowGame(chatId));
    }
    const game = games.get(chatId);
    const result = game.addPlayer(userId, username);
    await sendMessage(chatId, result.message);
    if (result.success) {
      await sendMessage(chatId, formatPlayerInfo(result.player));
      const keyboard = getJoinSuccessKeyboard(game.gameStarted);
      await sendMessage(chatId, `Выберите действие:`, { reply_markup: keyboard });
    }
    return;
  } else if (data === 'cmd_startgame') {
    if (!games.has(chatId)) {
      return await sendMessage(chatId, "Сначала присоединитесь к игре", { reply_markup: getStartInlineKeyboard() });
    }
    const game = games.get(chatId);
    const result = game.startGame();
    if (result.success) {
      const currentPlayer = game.getCurrentPlayer();
      await sendMessage(chatId, `${result.message}\n\nХод игрока: ${currentPlayer.username}`);
      await sendMessage(chatId, formatPlayerInfo(currentPlayer.getStatus()));
      await sendMessage(chatId, `Ваш ход ${currentPlayer.username}! Бросьте кубик:`, { reply_markup: getGameActionsKeyboard() });
    } else {
      await sendMessage(chatId, result.message);
    }
    return;
  } else if (data === 'cmd_roll') {
    if (!games.has(chatId)) {
      return await sendMessage(chatId, "Игра не найдена. Используйте /join", { reply_markup: getStartInlineKeyboard() });
    }
    const game = games.get(chatId);
    if (game.currentPlayerId !== userId) {
      const currentPlayer = game.getCurrentPlayer();
      return await sendMessage(chatId, `Сейчас ход игрока: ${currentPlayer.username}`);
    }
    const result = game.rollDice();
    if (result.success) {
      await sendMessage(chatId, result.message);
      if (result.card && !result.card.skip) {
        console.log('2 result.card', result.card);
        const keyboard = getCardKeyboard(result.card.type);
        const currentPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `${currentPlayer.username} выберите действие:`, { reply_markup: keyboard });
      }
      if (game.gameFinished) {
        await sendMessage(chatId, "🎉 ИГРА ЗАВЕРШЕНА! Победитель вышел из крысиных бегов!");
      } else if (!result.card || result.card.skip) {
        const nextPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
      }
    } else {
      await sendMessage(chatId, result.message);
    }
    return;
  } else if (data === 'cmd_status') {
    if (!games.has(chatId)) {
      return await sendMessage(chatId, "Игра не найдена. Используйте /join", { reply_markup: getStartInlineKeyboard() });
    }
    const game = games.get(chatId);
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
      message += `   💰 Деньги: $${player.cash}\n`;
      message += `   📊 Денежный поток: $${player.cashFlow}/месяц\n`;
      message += `   📈 Пассивный доход: $${player.passiveIncome}/месяц\n`;
      message += `   🏠 Активы: ${player.assetsCount}\n`;
      if (player.loansCount && player.loansCount > 0) {
        message += `   💳 Кредитов: ${player.loansCount} ($${player.totalLoans})\n`;
      }
      if (player.inFastTrack) {
        message += `   ⚡ На быстром треке!\n`;
      }
    });
    const keyboard = status.gameStarted ? getGameActionsKeyboard() : getJoinSuccessKeyboard(false);
    await sendMessage(chatId, message, { reply_markup: keyboard });
    return;
  } else if (data === 'cmd_myinfo') {
    if (!games.has(chatId)) {
      return await sendMessage(chatId, "Игра не найдена. Используйте /join", { reply_markup: getStartInlineKeyboard() });
    }
    const game = games.get(chatId);
    const player = game.players.get(userId);
    if (!player) {
      return await sendMessage(chatId, "Вы не в игре. Используйте /join", { reply_markup: getStartInlineKeyboard() });
    }
    // PhlBt
    await sendMessage(chatId, formatPlayerInfo(player.getStatus()), { reply_markup: getGameActionsKeyboard(true) });
    return;
  } else if (data === 'cmd_help') {
    const helpMessage = `
📖 Справка по командам:

/join - Присоединиться к игре
/startgame - Начать игру (после того как все присоединились)
/roll - Бросить кубик (ваш ход)
/buy - Купить актив из текущей сделки
/buywithloan - Купить актив с кредитом
/skip - Пропустить сделку
/pay - Оплатить расход (doodad карта)
/status - Посмотреть статус всех игроков
/myinfo - Ваша детальная информация
/loans - Посмотреть ваши кредиты
/payloan - Погасить кредит
/rules - Правила игры
/endgame - Завершить игру
    `;
    await sendMessage(chatId, helpMessage, { reply_markup: getStartInlineKeyboard() });
    return;
  } else if (data === 'cmd_rules') {
    const rulesMessage = `
📚 ПРАВИЛА ИГРЫ CASHFLOW

🎯 ЦЕЛЬ ИГРЫ:
Выйти из "крысиных бегов", накопив пассивный доход, который превышает ваши расходы.

📋 ОСНОВНЫЕ ПРАВИЛА:

1️⃣ НАЧАЛО ИГРЫ
• Используйте /join для присоединения к игре
• После присоединения всех игроков используйте /startgame
• Каждый игрок получает случайную профессию с зарплатой, расходами и начальными сбережениями

2️⃣ ХОД ИГРЫ
• Игроки ходят по очереди
• Бросьте кубик командой /roll
• В зависимости от клетки, на которую вы попали, происходят разные события

3️⃣ ТИПЫ КЛЕТОК:
• 🎯 МАЛАЯ СДЕЛКА - небольшие инвестиции (акции, квартиры)
• 💼 БОЛЬШАЯ СДЕЛКА - крупные инвестиции (бизнес, недвижимость)
• 📈 РЫНОК - события рынка (рост/падение цен, бонусы)
• 🎁 ВОЗМОЖНОСТЬ - специальные возможности
• 💸 РАСХОДЫ - непредвиденные траты (обязательны к оплате)
• 💰 ДЕНЬ ЗАРПЛАТЫ - получение зарплаты и расчет месячного баланса

4️⃣ МЕСЯЧНЫЙ БАЛАНС
В конце каждого месяца (при прохождении полного круга или попадании на день зарплаты):
• ➕ Вы получаете зарплату
• ➕ Вы получаете пассивный доход от всех активов
• ➖ Вы оплачиваете все расходы (базовые + от пассивов)

5️⃣ АКТИВЫ И ПАССИВНЫЙ ДОХОД
• Активы приносят пассивный доход каждый месяц
• Пассивный доход добавляется к вашему балансу автоматически
• Активы можно покупать за наличные или с помощью кредита

6️⃣ КРЕДИТОВАНИЕ
• Если у вас недостаточно денег для покупки актива, можно взять кредит
• Процентная ставка: 1% в месяц (≈12% годовых)
• Ежемесячные платежи по кредитам автоматически вычитаются из баланса
• Кредиты можно погасить досрочно командой /payloan

7️⃣ ДЕНЕЖНЫЙ ПОТОК
• Денежный поток = Общий доход - Общие расходы
• Общий доход = Зарплата + Пассивный доход
• Общие расходы = Базовые расходы + Платежи по кредитам + Расходы от пассивов

8️⃣ ПОБЕДА
🎉 Вы выходите из "крысиных бегов", когда:
   Пассивный доход > Общие расходы

💡 СТРАТЕГИЯ:
• Покупайте активы, которые приносят пассивный доход
• Управляйте кредитами разумно
• Стремитесь увеличить пассивный доход быстрее, чем растут расходы
• Используйте возможности рынка для увеличения дохода

📊 КОМАНДЫ:
• /status - посмотреть статус всех игроков
• /myinfo - ваша детальная информация
• /loans - ваши кредиты
• /help - справка по командам
    `;
    await sendMessage(chatId, rulesMessage, { reply_markup: getStartInlineKeyboard() });
    return;
  }

  // Обработка игровых действий
  if (data === 'buy') {
    const game = games.get(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.buyAsset();
      console.log('3 buy result', result);
      if (!result.canUseLoan)
        await sendMessage(chatId, result.message);
      if (result.success) {
        if (!game.gameFinished) {
          const nextPlayer = game.getCurrentPlayer();
          await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
        }
      } else if (result.canUseLoan) {
        // Предлагаем взять кредит
        const keyboard = {
          inline_keyboard: [
            [
              { text: '💳 Купить с кредитом', callback_data: 'buywithloan' },
              { text: '❌ Отмена', callback_data: 'skip' }
            ]
          ]
        };
        await sendMessage(chatId, result.message, { reply_markup: keyboard });
      }
    }
  } else if (data === 'skip') {
    const game = games.get(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.skipDeal();
      await sendMessage(chatId, result.message);
      const nextPlayer = game.getCurrentPlayer();
      await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
    }
  } else if (data === 'pay') {
    const game = games.get(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.payExpense(false);
      await sendMessage(chatId, result.message);
      if (result.success && !result.bankrupt) {
        const nextPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    }
  } else if (data === 'paywithloan') {
    const game = games.get(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.payExpense(true);
      await sendMessage(chatId, result.message);
      if (result.success && !result.bankrupt) {
        const nextPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    }
  } else if (data === 'market') {
    const game = games.get(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.processMarketCard();
      await sendMessage(chatId, result.message);
      const nextPlayer = game.getCurrentPlayer();
      await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
    }
  } else if (data === 'opportunity') {
    const game = games.get(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.processOpportunityCard();
      await sendMessage(chatId, result.message);
      const nextPlayer = game.getCurrentPlayer();
      await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
    }
  } else if (data === 'buywithloan') {
    const game = games.get(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.buyAsset(true); // Используем кредит
      console.log('4 buy result', result);
      await sendMessage(chatId, result.message);
      if (result.success) {
        if (!game.gameFinished) {
          const nextPlayer = game.getCurrentPlayer();
          await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
        }
      }
    }
  } else if (data === 'cmd_fastroll') {
    const game = games.get(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.rollDiceFastTrack();
      await sendMessage(chatId, result.message);
      if (result.success && !game.gameFinished) {
        await sendMessage(chatId, `${player.username} выберите действие:`, { reply_markup: getFastTrackKeyboard() });
      }
      if (game.gameFinished) {
        const winner = game.getWinner();
        await sendMessage(chatId, `🏆 ПОБЕДИТЕЛЬ: ${winner.username}\n💰 Финальный капитал: $${winner.finalCash}`);
      }
    }
  } else if (data === 'fastaccept') {
    const game = games.get(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.processFastTrackEvent(true);
      await sendMessage(chatId, result.message);
      if (game.gameFinished) {
        const winner = game.getWinner();
        await sendMessage(chatId, `🏆 ПОБЕДИТЕЛЬ: ${winner.username}\n💰 Финальный капитал: $${winner.finalCash}`);
      } else if (result.extraTurn) {
        await sendMessage(chatId, "🎲 У вас дополнительный ход!", { reply_markup: getFastTrackRollKeyboard() });
      } else {
        const nextPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    }
  } else if (data === 'fastskip') {
    const game = games.get(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.processFastTrackEvent(false);
      await sendMessage(chatId, result.message);
      if (!game.gameFinished) {
        const nextPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    }
  } else if (data.startsWith('votekick_')) {
    const game = games.get(chatId);
    if (game) {
      const targetUserId = parseInt(data.split('_')[1]);
      const result = game.voteKick(userId, targetUserId);
      await sendMessage(chatId, result.message);

      if (result.kicked && result.gameFinished) {
        // Игра завершена
      } else if (result.kicked) {
        const nextPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    }
  } else if (data.startsWith('payloan_')) {
    const game = games.get(chatId);
    const player = game ? game.players.get(userId) : null;
    if (player) {
      const parts = data.split('_');
      const loanId = parseInt(parts[1]);
      const paymentType = parts[2]; // 'full' или сумма

      const amount = paymentType === 'full' ? null : parseInt(paymentType);
      const result = player.payLoan(loanId, amount);
      await sendMessage(chatId, result.message);
    }
  } else if (data.startsWith('sellasset_')) {
    const game = games.get(chatId);
    const player = game ? game.players.get(userId) : null;
    if (player) {
      const assetId = parseInt(data.split('_')[1]);
      const result = game.sellAsset(assetId);
      await sendMessage(chatId, result.message);
    }
  }
});

// Вспомогательные функции
function formatPlayerInfo(player) {
  let info = `👤 ${player.username}\n`;
  info += `💼 Профессия: ${player.profession}\n`;
  info += `💰 Деньги: $${player.cash}\n`;
  info += `💵 Зарплата: $${player.salary}/месяц\n`;
  info += `💸 Расходы: $${player.expenses}/месяц\n`;
  info += `📈 Пассивный доход: $${player.passiveIncome}/месяц\n`;
  info += `📊 Общий доход: $${player.totalIncome}/месяц\n`;
  info += `📉 Общие расходы: $${player.totalExpenses}/месяц\n`;
  info += `💹 Денежный поток: $${player.cashFlow}/месяц\n`;
  info += `🏠 Активов: ${player.assetsCount}\n`;
  info += `📋 Пассивов: ${player.liabilitiesCount}\n`;

  // Информация о кредитах
  if (player.loansCount && player.loansCount > 0) {
    info += `💳 Кредитов: ${player.loansCount}\n`;
    info += `📊 Общая сумма кредитов: $${player.totalLoans}\n`;
    info += `💸 Платежи по кредитам: $${player.totalLoanPayments}/месяц\n`;
  }

  info += `📍 Позиция: ${player.position + 1}\n`;

  if (player.cashFlow > 0) {
    info += `\n✅ Положительный денежный поток!`;
  } else {
    info += `\n⚠️ Отрицательный денежный поток`;
  }

  if (player.passiveIncome >= player.totalExpenses) {
    info += `\n\n🎉 ВЫ ВЫШЛИ ИЗ КРЫСИНЫХ БЕГОВ!`;
  }

  if (player.inFastTrack) {
    info += `\n\n🚀 FAST TRACK:`;
    info += `\n💰 Капитал: $${player.fastTrackCash || 0}`;
    info += `\n💵 Доход: $${player.fastTrackIncome || 0}/мес`;
    info += `\n🎯 Цель (мечта): $${player.dreamCost || 0}`;
  }

  return info;
}

function getCardKeyboard(cardType) {
  const keyboard = {
    inline_keyboard: []
  };

  if (cardType === 'small' || cardType === 'big') {
    keyboard.inline_keyboard.push([
      { text: '✅ Купить', callback_data: 'buy' },
      { text: '💳 Купить с кредитом', callback_data: 'buywithloan' }
    ]);
    keyboard.inline_keyboard.push([
      { text: '❌ Пропустить', callback_data: 'skip' }
    ]);
  } else if (cardType === 'doodad') {
    keyboard.inline_keyboard.push([
      { text: '💸 Оплатить', callback_data: 'pay' },
      { text: '💳 С кредитом', callback_data: 'paywithloan' }
    ]);
  }

  return keyboard;
}

function getLoansKeyboard(loans) {
  const keyboard = {
    inline_keyboard: []
  };

  loans.forEach((loan, index) => {
    keyboard.inline_keyboard.push([
      { text: `Погасить кредит #${index + 1} ($${loan.remainingAmount})`, callback_data: `payloan_${loan.id}_full` }
    ]);
  });

  keyboard.inline_keyboard.push([
    { text: '📊 Моя информация', callback_data: 'cmd_myinfo' }
  ]);

  return keyboard;
}

function getSellAssetKeyboard(assets) {
  const keyboard = {
    inline_keyboard: []
  };

  assets.forEach((asset, index) => {
    keyboard.inline_keyboard.push([
      { text: `Продать актив #${index + 1} ($${asset.cost})`, callback_data: `sellasset_${asset.id}` }
    ]);
  });

  keyboard.inline_keyboard.push([
    { text: '📊 Моя информация', callback_data: 'cmd_myinfo' }
  ]);

  return keyboard;
}

// Установка глобальных команд меню
async function setupBotCommands() {
  const commands = [
    { command: 'start', description: 'Начать работу с ботом' },
    { command: 'join', description: 'Присоединиться к игре' },
    { command: 'startgame', description: 'Начать игру' },
    { command: 'roll', description: 'Бросить кубик' },
    { command: 'status', description: 'Статус игры' },
    { command: 'myinfo', description: 'Моя информация' },
    { command: 'rules', description: 'Правила игры' },
    { command: 'help', description: 'Справка по командам' },
    { command: 'endgame', description: 'Завершить игру' }
  ];

  try {
    await bot.setMyCommands(commands);
    console.log('✅ Глобальные команды установлены');
  } catch (error) {
    console.error('Ошибка установки команд:', error);
  }
}

function getStartInlineKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🎮 Присоединиться к игре', callback_data: 'cmd_join' }],
      [{ text: '📚 Правила игры', callback_data: 'cmd_rules' }, { text: '📖 Помощь', callback_data: 'cmd_help' }]
    ]
  };
}

function getGameActionsKeyboard(assets) {
  const keyboard = {
    inline_keyboard: [
      [{ text: '🎲 Бросить кубик', callback_data: 'cmd_roll' }],
      [{ text: '📊 Статус игры', callback_data: 'cmd_status' }, { text: '👤 Моя информация', callback_data: 'cmd_myinfo' }]
    ]
  };

  if (assets) {
    keyboard.inline_keyboard.push([
      { text: '💸 Кредиты', callback_data: 'cmd_loans' },
      { text: '📦 Активы', callback_data: 'cmd_sellasset' }
    ])
  }

  return keyboard
}

function getJoinSuccessKeyboard(hasGame) {
  const keyboard = {
    inline_keyboard: []
  };

  if (!hasGame) {
    keyboard.inline_keyboard.push([
      { text: '▶️ Начать игру', callback_data: 'cmd_startgame' }
    ]);
  }

  keyboard.inline_keyboard.push([
    { text: '📊 Статус', callback_data: 'cmd_status' }
  ]);

  return keyboard;
}

function getTurnActionsKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '✅ Купить', callback_data: 'buy' }, { text: '❌ Пропустить', callback_data: 'skip' }]
    ]
  };
}

function getFastTrackKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '✅ Принять', callback_data: 'fastaccept' }, { text: '❌ Пропустить', callback_data: 'fastskip' }]
    ]
  };
}

function getFastTrackRollKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🎲 Бросить кубик (Fast Track)', callback_data: 'cmd_fastroll' }]
    ]
  };
}

function getPlayerTurnKeyboard(player) {
  if (player.inFastTrack) {
    return getFastTrackRollKeyboard();
  }
  return getGameActionsKeyboard();
}

// Вызов установки команд при запуске
setupBotCommands();

console.log('🤖 CashFlow бот запущен!');
