module.exports = function(bot, gameManager, messageQueue, sendMessage, getStartInlineKeyboard, formatPlayerInfo, getJoinSuccessKeyboard, getGameActionsKeyboard, getCardKeyboard, getLoansKeyboard, getSellAssetKeyboard, getDealActionsKeyboard, getFastTrackKeyboard, getFastTrackRollKeyboard, getPlayerTurnKeyboard, getSellDealPlayerSelectKeyboard, getKickVotePlayerSelectKeyboard, formatCard, formatAssetsForSale) {

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

// Команда /mystats - личная статистика игрока
bot.onText(/\/mystats/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    const playerStats = await gameManager.getPlayerStats(userId);

    if (!playerStats) {
      await sendMessage(chatId, "У вас еще нет статистики. Сыграйте в игру!");
      return;
    }

    let message = `📊 ВАША СТАТИСТИКА\n\n`;
    message += `👤 Имя: ${playerStats.username}\n`;
    message += `🎮 Игр сыграно: ${playerStats.gamesPlayed}\n`;
    message += `🏆 Побед: ${playerStats.gamesWon}\n`;
    message += `💀 Банкротств: ${playerStats.gamesBankrupt}\n`;
    message += `📈 Лучший денежный поток: $${playerStats.bestCashFlow}\n`;
    message += `💰 Средний денежный поток: $${Math.round(playerStats.averageCashFlow)}\n`;

    if (playerStats.fastTrackEntries > 0) {
      message += `\n🚀 FAST TRACK:\n`;
      message += `Входов: ${playerStats.fastTrackEntries}\n`;
      message += `Побед на FT: ${playerStats.fastTrackWins}\n`;
      message += `Лучший капитал: $${playerStats.bestFastTrackCash}\n`;
    }

    if (playerStats.professionsPlayed.length > 0) {
      message += `\n💼 Любимые профессии:\n`;
      playerStats.professionsPlayed
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .forEach(prof => {
          message += `${prof.name}: ${prof.count} раз\n`;
        });
    }

    if (playerStats.achievements.length > 0) {
      message += `\n🏅 Достижения:\n`;
      playerStats.achievements.forEach(achievement => {
        message += `• ${achievement.name}\n`;
      });
    }

    await sendMessage(chatId, message);
  } catch (error) {
    await sendMessage(chatId, "Ошибка получения статистики");
  }
});

// Команда /leaderboard - топ игроков
bot.onText(/\/leaderboard(?: (wins|cash|games))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const criteria = match && match[1] ? match[1] : 'wins';

  const criteriaMap = {
    'wins': 'gamesWon',
    'cash': 'bestCashFlow',
    'games': 'gamesPlayed'
  };

  const sortBy = criteriaMap[criteria] || 'gamesWon';

  try {
    const topPlayers = await gameManager.getTopPlayers(sortBy, 10);

    if (!topPlayers || topPlayers.length === 0) {
      await sendMessage(chatId, "Пока нет игроков с статистикой");
      return;
    }

    let message = `🏆 ТОП ИГРОКОВ\n\n`;

    const criteriaNames = {
      'gamesWon': 'по победам',
      'bestCashFlow': 'по лучшему денежному потоку',
      'gamesPlayed': 'по количеству игр'
    };

    message += `📊 ${criteriaNames[sortBy]}\n\n`;

    topPlayers.forEach((player, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      message += `${medal} ${player.username}\n`;

      if (sortBy === 'gamesWon') {
        message += `   🏆 ${player.gamesWon} побед\n`;
      } else if (sortBy === 'bestCashFlow') {
        message += `   💰 $${player.bestCashFlow} макс. поток\n`;
      } else if (sortBy === 'gamesPlayed') {
        message += `   🎮 ${player.gamesPlayed} игр\n`;
      }

      message += `   💸 $${player.totalCashEarned} заработано\n\n`;
    });

    message += `Используйте:\n`;
    message += `/leaderboard wins - по победам\n`;
    message += `/leaderboard cash - по денежному потоку\n`;
    message += `/leaderboard games - по количеству игр`;

    await sendMessage(chatId, message);
  } catch (error) {
    await sendMessage(chatId, "Ошибка получения рейтинга");
  }
});

// Команда /help
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
📖 Справка по командам:

🎮 ИГРА:
/join - Присоединиться к игре
/startgame - Начать игру
/status - Статус игры
/endgame - Завершить игру

💰 ФИНАНСЫ:
/loans - Ваши кредиты
/payloan - Погасить кредит

📊 СТАТИСТИКА:
/mystats - Ваша статистика
/leaderboard - Топ игроков
/leaderboard wins - Топ по победам
/leaderboard cash - Топ по деньгам
/leaderboard games - Топ по играм

📚 ДРУГОЕ:
/rules - Правила игры
/votekick - Голосование за кик
/help - Эта справка

💡 Все игровые действия выполняются через кнопки!
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

  let game = await gameManager.getGame(chatId);
  if (!game) {
    game = await gameManager.createGame(chatId);
  }

  const result = game.addPlayer(userId, username);

  await sendMessage(chatId, result.message);

  if (result.success) {
    await gameManager.saveGame(chatId);
    await sendMessage(chatId, formatPlayerInfo(result.player));
    const keyboard = getJoinSuccessKeyboard(game.gameStarted);
    await sendMessage(chatId, `Выберите действие:`, { reply_markup: keyboard });
  }
});

// Команда /startgame
bot.onText(/\/startgame/, async (msg) => {
  const chatId = msg.chat.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Сначала присоединитесь к игре: /join", { reply_markup: getStartInlineKeyboard() });
  }

  const result = game.startGame();

  if (result.success) {
    await gameManager.saveGame(chatId);

    // Инициализируем статистику игры (только для игр с 2+ игроками)
    if (game.players.size >= 2) {
      await gameManager.initializeGameStats(chatId);
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
});

// Команда /roll (оставляем для совместимости, но рекомендуем использовать кнопки)
bot.onText(/\/roll/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена. Используйте /join", { reply_markup: getStartInlineKeyboard() });
  }

  if (game.currentPlayerId !== userId) {
    const currentPlayer = game.getCurrentPlayer();
    return await sendMessage(chatId, `Сейчас ход игрока: ${currentPlayer.username}`);
  }

  // Обновляем статистику хода игрока
  await gameManager.updatePlayerMove(chatId, userId);

  const result = game.rollDice();

  if (result.success) {
    await gameManager.saveGame(chatId);

    // Обновляем баланс игрока
    const player = game.players.get(userId);
    await gameManager.updatePlayerBalance(chatId, userId, player.cash, player.cashFlow);

    await sendMessage(chatId, result.message);

    if (game.gameFinished) {
      await sendMessage(chatId, "🎉 ИГРА ЗАВЕРШЕНА! Победитель вышел из крысиных бегов!");
      await gameManager.finishGameStats(chatId);
      await gameManager.deleteGame(chatId);
    }
  } else {
    await sendMessage(chatId, result.message);
  }
});

// Команда /small_deal - выбрать малую сделку
bot.onText(/\/small_deal/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  if (!game.currentCard || game.currentCard.type !== 'deal_choice') {
    return await sendMessage(chatId, "Сейчас не время выбирать тип сделки!");
  }

  // Генерируем малую сделку
  const { generateSmallDeal } = require('../game/cards');
  const card = generateSmallDeal();
  game.currentCard = card;

  const player = game.players.get(userId);
  const message = `🎯 МАЛАЯ СДЕЛКА:\n${game.formatCard(card)}\n\n💰 Баланс: $${player.cash}`;
  await sendMessage(chatId, message, { reply_markup: getDealActionsKeyboard(card) });
});

// Команда /big_deal - выбрать большую сделку
bot.onText(/\/big_deal/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  if (!game.currentCard || game.currentCard.type !== 'deal_choice') {
    return await sendMessage(chatId, "Сейчас не время выбирать тип сделки!");
  }

  // Генерируем большую сделку
  const { generateBigDeal } = require('../game/cards');
  const card = generateBigDeal();
  game.currentCard = card;

  const player = game.players.get(userId);
  const message = `💼 БОЛЬШАЯ СДЕЛКА:\n${game.formatCard(card)}\n\n💰 Баланс: $${player.cash}`;
  await sendMessage(chatId, message, { reply_markup: getDealActionsKeyboard(card) });
});

// Команда /roll_one - бросить 1 кубик (бонус от благотворительности)
bot.onText(/\/roll_one/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена. Используйте /join", { reply_markup: getStartInlineKeyboard() });
  }

  if (game.currentPlayerId !== userId) {
    const currentPlayer = game.getCurrentPlayer();
    return await sendMessage(chatId, `Сейчас ход игрока: ${currentPlayer.username}`);
  }

  if (!game.currentCard || game.currentCard.type !== 'dice_choice') {
    return await sendMessage(chatId, "Сейчас не время выбирать количество кубиков!");
  }

  const result = game.chooseDiceCount(1);

  if (result.success) {
    await gameManager.saveGame(chatId);

    // Обновляем статистику хода игрока
    await gameManager.updatePlayerMove(chatId, userId);

    await sendMessage(chatId, result.message);


    if (result.card && !result.card.skip) {
      const keyboard = getCardKeyboard(result.card.type);
      const currentPlayer = game.getCurrentPlayer();
      await sendMessage(chatId, `${currentPlayer.username} выберите действие:`, { reply_markup: keyboard });
    }

    if (game.gameFinished) {
      await sendMessage(chatId, "🎉 ИГРА ЗАВЕРШЕНА! Победитель вышел из крысиных бегов!");
      await gameManager.finishGameStats(chatId);
      await gameManager.deleteGame(chatId);
      } else if (!result.card || result.card.skip) {
        // Если нет карты, показываем кнопки для следующего хода
        const nextPlayer = game.getCurrentPlayer();
        if (nextPlayer.charityTurnsLeft > 0) {
          await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}\n\n🎗️ У вас есть эффект от благотворительности!\nВы можете выбрать количество кубиков для броска:`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
        } else {
          await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
        }
      }
  } else {
    await sendMessage(chatId, result.message);
  }
});

// Команда /roll_two - бросить 2 кубика (бонус от благотворительности)
bot.onText(/\/roll_two/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена. Используйте /join", { reply_markup: getStartInlineKeyboard() });
  }

  if (game.currentPlayerId !== userId) {
    const currentPlayer = game.getCurrentPlayer();
    return await sendMessage(chatId, `Сейчас ход игрока: ${currentPlayer.username}`);
  }

  if (!game.currentCard || game.currentCard.type !== 'dice_choice') {
    return await sendMessage(chatId, "Сейчас не время выбирать количество кубиков!");
  }

  const result = game.chooseDiceCount(2);

  if (result.success) {
    await gameManager.saveGame(chatId);

    // Обновляем статистику хода игрока
    await gameManager.updatePlayerMove(chatId, userId);

    await sendMessage(chatId, result.message);


    if (result.card && !result.card.skip) {
      const keyboard = getCardKeyboard(result.card.type);
      const currentPlayer = game.getCurrentPlayer();
      await sendMessage(chatId, `${currentPlayer.username} выберите действие:`, { reply_markup: keyboard });
    }

    if (game.gameFinished) {
      await sendMessage(chatId, "🎉 ИГРА ЗАВЕРШЕНА! Победитель вышел из крысиных бегов!");
      await gameManager.finishGameStats(chatId);
      await gameManager.deleteGame(chatId);
    } else if (!result.card || result.card.skip) {
      // Если нет карты, показываем кнопки для следующего хода
      const nextPlayer = game.getCurrentPlayer();
      await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
    }
  } else {
    await sendMessage(chatId, result.message);
  }
});

// Команда /buy
bot.onText(/\/buy/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  // Проверяем, выбрана ли сделка
  if (!game.currentCard || game.currentCard.type === 'deal_choice') {
    return await sendMessage(chatId, "Сначала выберите тип сделки командой /small_deal или /big_deal");
  }

  const result = game.buyAsset();

  if (result.success) {
    // Регистрируем выход на Скоростная дорожка если игрок купил актив и достиг условий
    const player = game.players.get(userId);
    if (player.canEscapeRatRace() && !player.inFastTrack) {
      await gameManager.registerFastTrackEntry(chatId, userId, player.position, player.cash);
    }

    await gameManager.saveGame(chatId);
    if (!game.gameFinished) {
      const nextPlayer = game.getCurrentPlayer();
      await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
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

// Команда /buy_market - покупка актива с рынка
bot.onText(/\/buy_market/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.buyMarketAsset();

  if (result.success) {
    // Регистрируем выход на Скоростная дорожка если игрок купил актив и достиг условий
    const player = game.players.get(userId);
    if (player.canEscapeRatRace() && !player.inFastTrack) {
      await gameManager.registerFastTrackEntry(chatId, userId, player.position, player.cash);
    }

    await gameManager.saveGame(chatId);
    if (!game.gameFinished) {
      const nextPlayer = game.getCurrentPlayer();
      if (nextPlayer.charityTurnsLeft > 0) {
        await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}\n\n🎗️ У вас есть эффект от благотворительности!\nВы можете выбрать количество кубиков для броска:`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      } else {
        await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    }
  } else {
    await sendMessage(chatId, result.message);
  }
});

// Команда /sell_market - продажа актива с рынка
bot.onText(/\/sell_market/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.sellMarketAsset();

  if (result.success) {
    await gameManager.saveGame(chatId);
    if (!game.gameFinished) {
      const nextPlayer = game.getCurrentPlayer();
      if (nextPlayer.charityTurnsLeft > 0) {
        await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}\n\n🎗️ У вас есть эффект от благотворительности!\nВы можете выбрать количество кубиков для броска:`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      } else {
        await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    }
  } else {
    await sendMessage(chatId, result.message);
  }
});

// Команда /use_credit_card - оплата расходов кредитной картой
bot.onText(/\/use_credit_card/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.useCreditCard();

  if (result.success) {
    await gameManager.saveGame(chatId);
    if (!game.gameFinished) {
      const nextPlayer = game.getCurrentPlayer();
      if (nextPlayer.charityTurnsLeft > 0) {
        await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}\n\n🎗️ У вас есть эффект от благотворительности!\nВы можете выбрать количество кубиков для броска:`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      } else {
        await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    }
  } else {
    await sendMessage(chatId, result.message);
  }
});

// Команда /sell_deal - начать процесс продажи сделки
bot.onText(/\/sell_deal/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.startSellDeal();
  await sendMessage(chatId, result.message);
});

// Команда /offer_deal <номер_игрока> - предложить сделку игроку
bot.onText(/\/offer_deal(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  if (!match || !match[1]) {
    return await sendMessage(chatId, "Укажите номер игрока: /offer_deal <номер>");
  }

  const targetPlayerIndex = parseInt(match[1]);
  const result = game.offerDealToPlayer(targetPlayerIndex);
  await sendMessage(chatId, result.message);
});

// Команда /set_markup <процент> - установить наценку для сделки
bot.onText(/\/set_markup(?: (\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  if (!match || !match[1]) {
    return await sendMessage(chatId, "Укажите процент наценки: /set_markup <1|3|5>");
  }

  const markupPercent = parseInt(match[1]);
  const result = game.setMarkupAndOffer(markupPercent);
  await sendMessage(chatId, result.message);
});

// Команда /accept_deal - принять предложенную сделку
bot.onText(/\/accept_deal/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.acceptDeal();

  if (result.success) {
    await gameManager.saveGame(chatId);
    if (!game.gameFinished) {
      const nextPlayer = game.getCurrentPlayer();
      if (nextPlayer.charityTurnsLeft > 0) {
        await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}\n\n🎗️ У вас есть эффект от благотворительности!\nВы можете выбрать количество кубиков для броска:`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      } else {
        await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    }
  } else {
    await sendMessage(chatId, result.message);
  }
});

// Команда /decline_deal - отказаться от предложенной сделки
bot.onText(/\/decline_deal/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.declineDeal();
  await sendMessage(chatId, result.message);
});

// Команда /buywithloan
bot.onText(/\/buywithloan/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.buyAsset(true); // Используем кредит
  await sendMessage(chatId, result.message);

  if (result.success) {
    // Регистрируем выход на Скоростная дорожка если игрок купил актив и достиг условий
    const player = game.players.get(userId);
    if (player.canEscapeRatRace() && !player.inFastTrack) {
      await gameManager.registerFastTrackEntry(chatId, userId, player.position, player.cash);
    }

    await gameManager.saveGame(chatId);
    if (!game.gameFinished) {
      const nextPlayer = game.getCurrentPlayer();
      if (nextPlayer.charityTurnsLeft > 0) {
        await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}\n\n🎗️ У вас есть эффект от благотворительности!\nВы можете выбрать количество кубиков для броска:`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      } else {
        await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    }
  }
});

// Команда /skip
bot.onText(/\/skip/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.skipDeal();
  await sendMessage(chatId, result.message);

  await gameManager.saveGame(chatId);
  const nextPlayer = game.getCurrentPlayer();
  if (nextPlayer.charityTurnsLeft > 0) {
    await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}\n\n🎗️ У вас есть эффект от благотворительности!\nВы можете выбрать количество кубиков для броска:`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
  } else {
    await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
  }
});

// Команда /pay
bot.onText(/\/pay/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.payExpense();

  const inline_keyboard = result.canUseLoan
    ? [{ text: '💳 С кредитом', callback_data: 'paywithloan' }]
    : []

  await sendMessage(chatId, result.message, { reply_markup: inline_keyboard });

  await gameManager.saveGame(chatId);
  const nextPlayer = game.getCurrentPlayer();
  if (nextPlayer.charityTurnsLeft > 0) {
    await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}\n\n🎗️ У вас есть эффект от благотворительности!\nВы можете выбрать количество кубиков для броска:`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
  } else {
    await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
  }
});

// Команда /status
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;

  const game = await gameManager.getGame(chatId);
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



// Команда /loans - просмотр кредитов
bot.onText(/\/loans/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
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
});

// Команда /payloan - погашение кредита
bot.onText(/\/payloan(?: (.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
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
    await gameManager.saveGame(chatId);
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

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.payExpense(true);
  await sendMessage(chatId, result.message);

  if (result.success && !result.bankrupt) {
    await gameManager.saveGame(chatId);
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

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

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

  await gameManager.saveGame(chatId);

  // Если был расход, проверяем можно ли теперь оплатить
  if (result.success && game.currentCard && game.currentCard.type === 'doodad') {
    await sendMessage(chatId, `💸 Нужно оплатить: $${game.currentCard.cost}\n💰 У вас: $${player.cash}\n\nИспользуйте /pay для оплаты`);
  }
});

// Команда /votekick - голосование за исключение игрока
bot.onText(/\/votekick/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  if (game.players.size < 3) {
    return await sendMessage(chatId, "Для голосования нужно минимум 3 игрока");
  }

  // Получаем список других игроков
  const otherPlayers = Array.from(game.players.values()).filter(p => p.userId !== userId);

  if (otherPlayers.length === 0) {
    return await sendMessage(chatId, "Нет игроков для исключения");
  }

  // Показываем клавиатуру для выбора игрока
  const keyboard = getKickVotePlayerSelectKeyboard(otherPlayers);
  await sendMessage(chatId, "🗳️ Выберите игрока для голосования за исключение:", { reply_markup: keyboard });
});

// Команда /fastroll - бросок на Скоростная дорожка
bot.onText(/\/fastroll/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.rollDiceFastTrack();
  await sendMessage(chatId, result.message);

  if (result.success && !game.gameFinished) {
    await sendMessage(chatId, `${result.player.username} выберите действие:`, { reply_markup: getFastTrackKeyboard() });
  }

  if (game.gameFinished) {
    await gameManager.saveGame(chatId);
    const winner = game.getWinner();
    await sendMessage(chatId, `🏆 ПОБЕДИТЕЛЬ: ${winner.username}\n💰 Финальный капитал: $${winner.finalCash}`);
  }
});

// Команда /fastaccept - принять событие Скоростная дорожка
bot.onText(/\/fastaccept/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.processFastTrackEvent(true);
  await sendMessage(chatId, result.message);

  if (game.gameFinished) {
    await gameManager.saveGame(chatId);
    const winner = game.getWinner();
    await sendMessage(chatId, `🏆 ПОБЕДИТЕЛЬ: ${winner.username}\n💰 Финальный капитал: $${winner.finalCash}`);
  } else if (result.extraTurn) {
    await sendMessage(chatId, "🎲 У вас дополнительный ход!", { reply_markup: getFastTrackRollKeyboard() });
  } else {
    // Проверяем, не вышел ли игрок на Скоростная дорожка
    const player = game.players.get(userId);
    if (player.canEscapeRatRace() && !player.inFastTrack) {
      await gameManager.registerFastTrackEntry(chatId, userId, player.position, player.cash);
    }

    await gameManager.saveGame(chatId);
    const nextPlayer = game.getCurrentPlayer();
    await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
  }
});

// Команда /fastskip - пропустить событие Скоростная дорожка
bot.onText(/\/fastskip/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = await gameManager.getGame(chatId);
  if (!game) {
    return await sendMessage(chatId, "Игра не найдена");
  }

  if (game.currentPlayerId !== userId) {
    return await sendMessage(chatId, "Не ваш ход!");
  }

  const result = game.processFastTrackEvent(false);
  await sendMessage(chatId, result.message);

  if (!game.gameFinished) {
    await gameManager.saveGame(chatId);
    const nextPlayer = game.getCurrentPlayer();
    await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
  }
});

// Команда /endgame
bot.onText(/\/endgame/, async (msg) => {
  const chatId = msg.chat.id;

  const game = await gameManager.getGame(chatId);
  if (game) {
    await gameManager.deleteGame(chatId);
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

  if (data === 'cmd_viewassets' || data.startsWith('assets_page_')) {
    const game = await gameManager.getGame(chatId);
    if (!game) {
      return await sendMessage(chatId, "Игра не найдена");
    }

    if (game.currentPlayerId !== userId) {
      return await sendMessage(chatId, "Не ваш ход!");
    }

    const player = game.getCurrentPlayer();
    const page = data.startsWith('assets_page_') ? parseInt(data.split('_')[2]) : 0;

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
  } else if (data === 'cmd_loans' || data.startsWith('loans_page_')) {
    const game = await gameManager.getGame(chatId);
    if (!game) {
      return await sendMessage(chatId, "Игра не найдена. Используйте /join");
    }

    const player = game.players.get(userId);

    if (!player) {
      return await sendMessage(chatId, "Вы не в игре. Используйте /join");
    }

    const loansInfo = player.getLoansInfo();
    const page = data.startsWith('loans_page_') ? parseInt(data.split('_')[2]) : 0;

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
  } else if (data === 'cmd_join') {
    const username = query.from.first_name || query.from.username || 'Игрок';
    let game = await gameManager.getGame(chatId);
    if (!game) {
      game = await gameManager.createGame(chatId);
    }
    const result = game.addPlayer(userId, username);
    await sendMessage(chatId, result.message);
    if (result.success) {
      await gameManager.saveGame(chatId);
      await sendMessage(chatId, formatPlayerInfo(result.player));
      const keyboard = getJoinSuccessKeyboard(game.gameStarted);
      await sendMessage(chatId, `Выберите действие:`, { reply_markup: keyboard });
    }
    return;
  } else if (data === 'cmd_startgame') {
    const game = await gameManager.getGame(chatId);
    if (!game) {
      return await sendMessage(chatId, "Сначала присоединитесь к игре", { reply_markup: getStartInlineKeyboard() });
    }
    const result = game.startGame();
    if (result.success) {
      await gameManager.saveGame(chatId);
      const currentPlayer = game.getCurrentPlayer();
      await sendMessage(chatId, `${result.message}\n\nХод игрока: ${currentPlayer.username}`);
      await sendMessage(chatId, formatPlayerInfo(currentPlayer.getStatus()));
      await sendMessage(chatId, `Ваш ход ${currentPlayer.username}! Бросьте кубик:`, { reply_markup: getGameActionsKeyboard() });
    } else {
      await sendMessage(chatId, result.message);
    }
    return;
  } else if (data === 'cmd_roll') {
    const game = await gameManager.getGame(chatId);
    if (!game) {
      return await sendMessage(chatId, "Игра не найдена. Используйте /join", { reply_markup: getStartInlineKeyboard() });
    }
    if (game.currentPlayerId !== userId) {
      const currentPlayer = game.getCurrentPlayer();
      return await sendMessage(chatId, `Сейчас ход игрока: ${currentPlayer.username}`);
    }
    const result = game.rollDice();
    console.log('cmd_roll result', result)
    if (result.success) {
      await gameManager.saveGame(chatId);
      await sendMessage(chatId, result.message);
      if (result.card && !result.card.skip) {
        const keyboard = getCardKeyboard(result.card.type);
        const currentPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `${currentPlayer.username} выберите действие:`, { reply_markup: keyboard });
      }
      if (game.gameFinished) {
        await sendMessage(chatId, "🎉 ИГРА ЗАВЕРШЕНА! Победитель вышел из крысиных бегов!");
      } else if (!result.card || result.card.skip) {
        const nextPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    } else {
      await sendMessage(chatId, result.message);
    }
    return;
  } else if (data === 'cmd_status') {
    const game = await gameManager.getGame(chatId);
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
    // Убираем кнопки из статуса игры
    await sendMessage(chatId, message);
    return;
  } else if (data === 'cmd_myinfo') {
    const game = await gameManager.getGame(chatId);
    if (!game) {
      return await sendMessage(chatId, "Игра не найдена. Используйте /join", { reply_markup: getStartInlineKeyboard() });
    }
    const player = game.players.get(userId);
    if (!player) {
      return await sendMessage(chatId, "Вы не в игре. Используйте /join", { reply_markup: getStartInlineKeyboard() });
    }
    // Показываем только кнопки кредитов и активов для детального просмотра
    await sendMessage(chatId, formatPlayerInfo(player.getStatus()), { reply_markup: getGameActionsKeyboard(true, true, false) });
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
    await sendMessage(chatId, rulesMessage);
    return;
  }

  // Обработка игровых действий
  if (data === 'buy') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.buyAsset();
      if (!result.canUseLoan)
        await sendMessage(chatId, result.message);
  if (result.success) {
    await gameManager.saveGame(chatId);
    if (!game.gameFinished) {
      const nextPlayer = game.getCurrentPlayer();
      if (nextPlayer.charityTurnsLeft > 0) {
        await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}\n\n🎗️ У вас есть эффект от благотворительности!\nВы можете выбрать количество кубиков для броска:`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      } else {
        await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
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
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.skipDeal();
      await sendMessage(chatId, result.message);
      await gameManager.saveGame(chatId);
      const nextPlayer = game.getCurrentPlayer();
      if (nextPlayer.charityTurnsLeft > 0) {
        await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}\n\n🎗️ У вас есть эффект от благотворительности!\nВы можете выбрать количество кубиков для броска:`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      } else {
        await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    }
  } else if (data === 'pay') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.payExpense(false);
      await sendMessage(chatId, result.message);
      if (result.success && !result.bankrupt) {
        await gameManager.saveGame(chatId);
        const nextPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    }
  } else if (data === 'paywithloan') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.payExpense(true);
      await sendMessage(chatId, result.message);
      if (result.success && !result.bankrupt) {
        await gameManager.saveGame(chatId);
        const nextPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    }
  } else if (data === 'market') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.processMarketCard();
      await sendMessage(chatId, result.message);
      await gameManager.saveGame(chatId);
      const nextPlayer = game.getCurrentPlayer();
      await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
    }
  } else if (data === 'opportunity') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.processOpportunityCard();

      // Если есть стоимость и можно отказаться - показываем кнопки
      if (result.cost) {
        const keyboard = {
          inline_keyboard: [
            [{ text: `💸 Оплатить $${result.cost}`, callback_data: 'pay_opportunity' }]
          ]
        };
        await sendMessage(chatId, result.message, { reply_markup: keyboard });
      } else {
        // Обычная возможность - применяем сразу
        await sendMessage(chatId, result.message);
        await gameManager.saveGame(chatId);
        const nextPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
      }
    }
  } else if (data === 'buywithloan') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.buyAsset(true); // Используем кредит
      await sendMessage(chatId, result.message);
    if (result.success) {
      await gameManager.saveGame(chatId);
      if (!game.gameFinished) {
        const nextPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    }
    }
  } else if (data === 'cmd_fastroll') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.rollDiceFastTrack();
      await sendMessage(chatId, result.message);
      if (result.success && !game.gameFinished) {
        const player = game.getCurrentPlayer();
        await sendMessage(chatId, `${player.username} выберите действие:`, { reply_markup: getFastTrackKeyboard() });
      }
      if (game.gameFinished) {
        await gameManager.saveGame(chatId);
        const winner = game.getWinner();
        await sendMessage(chatId, `🏆 ПОБЕДИТЕЛЬ: ${winner.username}\n💰 Финальный капитал: $${winner.finalCash}`);
      }
    }
  } else if (data === 'fastaccept') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.processFastTrackEvent(true);
      await sendMessage(chatId, result.message);
      if (game.gameFinished) {
        await gameManager.saveGame(chatId);
        const winner = game.getWinner();
        await sendMessage(chatId, `🏆 ПОБЕДИТЕЛЬ: ${winner.username}\n💰 Финальный капитал: $${winner.finalCash}`);
      } else if (result.extraTurn) {
        await sendMessage(chatId, "🎲 У вас дополнительный ход!", { reply_markup: getFastTrackRollKeyboard() });
      } else {
        await gameManager.saveGame(chatId);
        const nextPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    }
  } else if (data === 'fastskip') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.processFastTrackEvent(false);
      await sendMessage(chatId, result.message);
      if (!game.gameFinished) {
        await gameManager.saveGame(chatId);
        const nextPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    }
  } else if (data.startsWith('votekick_')) {
    const game = await gameManager.getGame(chatId);
    if (game) {
      const targetUserId = parseInt(data.split('_')[1]);
      const result = game.voteKick(userId, targetUserId);
      await sendMessage(chatId, result.message);

      if (result.kicked && result.gameFinished) {
        // Игра завершена
      } else if (result.kicked) {
        await gameManager.saveGame(chatId);
        const nextPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    }
  } else if (data.startsWith('payloan_')) {
    const game = await gameManager.getGame(chatId);
    const player = game ? game.players.get(userId) : null;
    if (player) {
      const parts = data.split('_');
      const loanId = parseInt(parts[1]);
      const paymentType = parts[2]; // 'full' или сумма

      const amount = paymentType === 'full' ? null : parseInt(paymentType);
      const result = player.payLoan(loanId, amount);
      await sendMessage(chatId, result.message);
      await gameManager.saveGame(chatId);
    }
  } else if (data === 'small_deal') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId && game.currentCard && game.currentCard.type === 'deal_choice') {
      // Генерируем малую сделку
      const { generateSmallDeal } = require('../game/cards');
      const card = generateSmallDeal();
      game.currentCard = card;

      const player = game.players.get(userId);
      const message = `🎯 МАЛАЯ СДЕЛКА:\n${game.formatCard(card)}\n\n💰 Баланс: $${player.cash}`;
      await sendMessage(chatId, message, { reply_markup: getCardKeyboard(card.type) });
    }
  } else if (data === 'big_deal') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId && game.currentCard && game.currentCard.type === 'deal_choice') {
      // Генерируем большую сделку
      const { generateBigDeal } = require('../game/cards');
      const card = generateBigDeal();
      game.currentCard = card;

      const player = game.players.get(userId);
      const message = `💼 БОЛЬШАЯ СДЕЛКА:\n${game.formatCard(card)}\n\n💰 Баланс: $${player.cash}`;
      await sendMessage(chatId, message, { reply_markup: getCardKeyboard(card.type) });
    }
  } else if (data === 'charity_accept') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId && game.currentCard && game.currentCard.type === 'charity') {
      // Применяем благотворительность
      const player = game.players.get(userId);
      const charityAmount = Math.floor(player.totalIncome * 0.1);

      if (player.cash >= charityAmount) {
        player.pay(charityAmount);
        player.charityTurnsLeft = 3;
        game.currentCard = null;
        game.waitingForAction = false;

        const message = `✅ Благотворительность принята!\n💸 Пожертвовано: ₽${charityAmount}\n🎲 Следующие 3 хода: право бросать 1 или 2 кубика\n💰 Баланс: ₽${player.cash}`;
        await sendMessage(chatId, message);
        await gameManager.saveGame(chatId);
        game.nextTurn();
        const nextPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      } else {
        await sendMessage(chatId, `❌ Недостаточно средств! Нужно: ₽${charityAmount}, у вас: ₽${player.cash}`);
      }
    }
  } else if (data === 'charity_skip') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId && game.currentCard && game.currentCard.type === 'charity') {
      // Отказываемся от благотворительности
      game.currentCard = null;
      game.waitingForAction = false;

      const message = `❌ Благотворительность пропущена\nИгра продолжается без бонуса`;
      await sendMessage(chatId, message);
      await gameManager.saveGame(chatId);
      game.nextTurn();
      const nextPlayer = game.getCurrentPlayer();
      await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
    }
  } else if (data === 'pay_opportunity') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId && game.currentCard) {
      const player = game.players.get(userId);
      const cost = game.currentCard.cost;

      if (player.cash >= cost) {
        player.pay(cost);
        await sendMessage(chatId, `✅ Оплачено: $${cost}\n${game.currentCard.description}`);
      } else {
        await sendMessage(chatId, `❌ Недостаточно средств! Нужно: $${cost}, у вас: $${player.cash}`);
      }

      game.currentCard = null;
      game.waitingForAction = false;
      await gameManager.saveGame(chatId);
      const nextPlayer = game.getCurrentPlayer();
      await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
    }
  } else if (data === 'skip_opportunity') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      await sendMessage(chatId, "Вы отказались от возможности");
      game.currentCard = null;
      game.waitingForAction = false;
      await gameManager.saveGame(chatId);
      const nextPlayer = game.getCurrentPlayer();
      await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
    }
  } else if (data.startsWith('sellasset_')) {
    const game = await gameManager.getGame(chatId);
    const player = game ? game.players.get(userId) : null;
    if (player) {
      const assetId = parseInt(data.split('_')[1]);
      const result = game.sellAsset(assetId);
      await sendMessage(chatId, result.message);
      await gameManager.saveGame(chatId);
    }
  }

  // Обработка продажи сделок между игроками
  else if (data === 'sell_deal') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.startSellDeal();
      if (result.success) {
        // Получаем список других игроков для клавиатуры
        const otherPlayers = Array.from(game.players.values())
          .filter(p => p.userId !== userId);
        const keyboard = getSellDealPlayerSelectKeyboard(otherPlayers);
        await sendMessage(chatId, result.message, { reply_markup: keyboard });
      } else {
        await sendMessage(chatId, result.message);
      }
    }
  } else if (data.startsWith('offer_deal_')) {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const targetPlayerIndex = parseInt(data.split('_')[2]);
      const result = game.offerDealToPlayer(targetPlayerIndex);
      if (result.success) {
        await sendMessage(chatId, result.message, { reply_markup: getCardKeyboard('sell_deal_markup') });
      } else {
        await sendMessage(chatId, result.message);
      }
    }
  } else if (data.startsWith('set_markup_')) {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const markupPercent = parseInt(data.split('_')[2]);
      const result = game.setMarkupAndOffer(markupPercent);
      await sendMessage(chatId, result.message);
      // Сообщение автоматически отправляется всем игрокам
    }
  } else if (data === 'accept_deal') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.acceptDeal();
      if (result.success) {
        await gameManager.saveGame(chatId);
        if (!game.gameFinished) {
          const nextPlayer = game.getCurrentPlayer();
          await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
        }
      } else {
        await sendMessage(chatId, result.message);
      }
    }
  } else if (data === 'decline_deal') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.declineDeal();
      await sendMessage(chatId, result.message);
    }
  }

  // Обработка рыночных сделок
  else if (data === 'buy_market') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.buyMarketAsset();
      if (result.success) {
        await gameManager.saveGame(chatId);
        if (!game.gameFinished) {
          const nextPlayer = game.getCurrentPlayer();
          await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
        }
      } else {
        await sendMessage(chatId, result.message);
      }
    }
  } else if (data === 'sell_market') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.sellMarketAsset();
      if (result.success) {
        await gameManager.saveGame(chatId);
        if (!game.gameFinished) {
          const nextPlayer = game.getCurrentPlayer();
          await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
        }
      } else {
        await sendMessage(chatId, result.message);
      }
    }
  }

  // Обработка кредитной карты
  else if (data === 'use_credit_card') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.useCreditCard();
      await sendMessage(chatId, result.message);
      if (result.success) {
        await gameManager.saveGame(chatId);
        if (!game.gameFinished) {
          const nextPlayer = game.getCurrentPlayer();
          await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
        }
      }
    }
  }

  // Обработка оплаты возможности
  else if (data === 'pay_opportunity') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const player = game.getCurrentPlayer();
      const cost = game.currentCard.cost;

      if (player.cash >= cost) {
        player.pay(cost);
        await sendMessage(chatId, `✅ Оплачено: ₽${cost}\n${game.currentCard.description}`);
      } else {
        await sendMessage(chatId, `❌ Недостаточно средств! Нужно: ₽${cost}, у вас: ₽${player.cash}`);
      }

      game.currentCard = null;
      game.waitingForAction = false;
      await gameManager.saveGame(chatId);
      const nextPlayer = game.getCurrentPlayer();
      await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
    }
  }

  // Обработка кредитной карты для возможности
  else if (data === 'use_credit_card_opportunity') {
    const game = await gameManager.getGame(chatId);
    if (game && game.currentPlayerId === userId) {
      const result = game.useCreditCard();
      await sendMessage(chatId, result.message);
      if (result.success) {
        await gameManager.saveGame(chatId);
        if (!game.gameFinished) {
          const nextPlayer = game.getCurrentPlayer();
          await sendMessage(chatId, `Следующий ход: ${nextPlayer.username}`, { reply_markup: getGameActionsKeyboard() });
        }
      }
    }
  }

  // Обработка выбора количества кубиков (бонус от благотворительности)
  else if (data === 'roll_one') {
    const game = await gameManager.getGame(chatId);
    if (!game) {
      return await sendMessage(chatId, "Игра не найдена. Используйте /join", { reply_markup: getStartInlineKeyboard() });
    }
    if (game.currentPlayerId !== userId) {
      const currentPlayer = game.getCurrentPlayer();
      return await sendMessage(chatId, `Сейчас ход игрока: ${currentPlayer.username}`);
    }
    if (!game.currentCard || game.currentCard.type !== 'dice_choice') {
      return await sendMessage(chatId, "Сейчас не время выбирать количество кубиков!");
    }
    const result = game.chooseDiceCount(1);
    if (result.success) {
      await gameManager.saveGame(chatId);
      // Обновляем статистику хода игрока
      await gameManager.updatePlayerMove(chatId, userId);
      await sendMessage(chatId, result.message);
      if (result.card && !result.card.skip) {
        const keyboard = getCardKeyboard(result.card.type);
        const currentPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `${currentPlayer.username} выберите действие:`, { reply_markup: keyboard });
      }
      if (game.gameFinished) {
        await sendMessage(chatId, "🎉 ИГРА ЗАВЕРШЕНА! Победитель вышел из крысиных бегов!");
        await gameManager.finishGameStats(chatId);
        await gameManager.deleteGame(chatId);
      } else if (!result.card || result.card.skip) {
        const nextPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    } else {
      await sendMessage(chatId, result.message);
    }
  } else if (data === 'roll_two') {
    const game = await gameManager.getGame(chatId);
    if (!game) {
      return await sendMessage(chatId, "Игра не найдена. Используйте /join", { reply_markup: getStartInlineKeyboard() });
    }
    if (game.currentPlayerId !== userId) {
      const currentPlayer = game.getCurrentPlayer();
      return await sendMessage(chatId, `Сейчас ход игрока: ${currentPlayer.username}`);
    }
    if (!game.currentCard || game.currentCard.type !== 'dice_choice') {
      return await sendMessage(chatId, "Сейчас не время выбирать количество кубиков!");
    }
    const result = game.chooseDiceCount(2);
    if (result.success) {
      await gameManager.saveGame(chatId);
      // Обновляем статистику хода игрока
      await gameManager.updatePlayerMove(chatId, userId);
      await sendMessage(chatId, result.message);
      if (result.card && !result.card.skip) {
        const keyboard = getCardKeyboard(result.card.type);
        const currentPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `${currentPlayer.username} выберите действие:`, { reply_markup: keyboard });
      }
      if (game.gameFinished) {
        await sendMessage(chatId, "🎉 ИГРА ЗАВЕРШЕНА! Победитель вышел из крысиных бегов!");
        await gameManager.finishGameStats(chatId);
        await gameManager.deleteGame(chatId);
      } else if (!result.card || result.card.skip) {
        const nextPlayer = game.getCurrentPlayer();
        await sendMessage(chatId, `Ход переходит к игроку: ${nextPlayer.username}`, { reply_markup: getPlayerTurnKeyboard(nextPlayer) });
      }
    } else {
      await sendMessage(chatId, result.message);
    }
  }


});

};
