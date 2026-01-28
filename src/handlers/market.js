/**
 * Обработчики для market событий
 */

const { markets } = require('../game/cards/markets');
const { applyInflation, getThreadId } = require('../utils');
const { formatNumber } = require('../utils');

/**
 * Определяет, требует ли market карточка взаимодействия игроков
 * @param {Object} marketCard - Market карточка
 * @returns {boolean} true, если карточка требует взаимодействия
 */
function requiresPlayerInteraction(marketCard) {
  // Карточка требует взаимодействия, если есть возможность продажи активов
  // И нет автоматических эффектов (passiveIncome, creditMultiple, inflation)
  const hasAutomaticEffect = marketCard.passiveIncome || marketCard.creditMultiple || marketCard.inflation;
  const hasSellOption = (marketCard.cost || marketCard.apartmentCost || marketCard.costMultiple) &&
    marketCard.relatedDeals && marketCard.relatedDeals.length > 0;
  return hasSellOption && !hasAutomaticEffect;
}

/**
 * Обрабатывает попадание на поле Market
 * @param {string} gameId - ID игры
 * @param {string} userId - ID пользователя
 * @param {Object} services - Объект с сервисами { gameService, messageService }
 */
async function handleMarket(gameId, services) {
  const { gameService, messageService } = services;

  const game = await gameService.getGame(gameId);
  if (!game) {
    throw new Error('Игра не найдена');
  }

  // Выбрать случайную market карточку
  const marketCard = await selectRandomMarketCard(gameId, services);

  // Сохранить текущую market карточку
  await gameService.databaseService.setCurrentMarket(gameId, marketCard);

  // Применить автоматические эффекты (если есть)
  if (marketCard.passiveIncome || marketCard.creditMultiple || marketCard.inflation) {
    await applyAutomaticMarketEffects(gameId, marketCard, services);
  }

  // Определить, требует ли карточка взаимодействия игроков
  const needsInteraction = requiresPlayerInteraction(marketCard);

  if (!needsInteraction) {
    // Карточка не требует взаимодействия - показать только текущему игроку без создания циркуляции
    const currentPlayer = await gameService.getCurrentPlayer(gameId);
    const gameAfterInit = await gameService.getGame(gameId);
    const threadId = game.threadId || null;
    await messageService.sendMarketCardWithSkipButton(game.chatId, marketCard, currentPlayer, gameAfterInit, threadId, false);
    // Вернуть null, чтобы сигнализировать, что обработка началась
    return null;
  }

  // Карточка требует взаимодействия - запустить циркуляцию для эффектов продажи (если есть игроки с активами)
  await initializeMarketCirculation(gameId, marketCard, services);

  // НЕ показываем сообщение первому игроку - это будет делаться из handleRollDice()
  // Вернуть marketCard, чтобы handleRollDice мог отправить комбинированное сообщение
  return marketCard;
}

/**
 * Выбирает случайную market карточку с трекингом использованных
 * @param {string} gameId - ID игры
 * @param {Object} services - Объект с сервисами
 * @returns {Object} Market карточка
 */
async function selectRandomMarketCard(gameId, services) {
  const { gameService } = services;

  const game = await gameService.getGame(gameId);
  const usedIds = game.usedMarketIds || [];

  // Найти доступные карточки
  const available = markets.filter(card => !usedIds.includes(card.title));

  let selectedCard;
  if (available.length === 0) {
    // Все карточки использованы - сбросить и выбрать случайную
    await gameService.databaseService.setUsedMarketIds(gameId, []);
    selectedCard = markets[Math.floor(Math.random() * markets.length)];
  } else {
    selectedCard = available[Math.floor(Math.random() * available.length)];
  }

  // Добавить в использованные
  usedIds.push(selectedCard.title);
  await gameService.databaseService.setUsedMarketIds(gameId, usedIds);

  // Применить inflation к ценам market карточки
  const inflation = game.inflation || 1;
  selectedCard = applyInflation(selectedCard, inflation);

  return selectedCard;
}

/**
 * Применяет автоматические эффекты market карточки
 * @param {string} gameId - ID игры
 * @param {Object} marketCard - Market карточка
 * @param {Object} services - Объект с сервисами
 */
async function applyAutomaticMarketEffects(gameId, marketCard, services) {
  const { gameService } = services;

  const game = await gameService.getGame(gameId);

  // Обработать passiveIncome
  if (marketCard.passiveIncome) {
    await applyPassiveIncomeEffect(gameId, marketCard, services);
  }

  // Обработать creditMultiple
  if (marketCard.creditMultiple) {
    await gameService.databaseService.setCreditMultiple(gameId, marketCard.creditMultiple);
    console.log('Credit multiple updated to:', marketCard.creditMultiple);
  }

  // Обработать inflation
  if (marketCard.inflation) {
    const inflation = game.inflation * marketCard.inflation
    await gameService.databaseService.setInflation(gameId, inflation);
    console.log('Inflation updated to:', marketCard.inflation);
  }
}

/**
 * Применяет эффект passiveIncome к активам игроков
 * @param {string} gameId - ID игры
 * @param {Object} marketCard - Market карточка
 * @param {Object} services - Объект с сервисами
 */
async function applyPassiveIncomeEffect(gameId, marketCard, services) {
  const { gameService } = services;

  const game = await gameService.getGame(gameId);
  const relatedDeals = marketCard.relatedDeals || [];

  // Пройтись по всем игрокам
  for (const player of game.players) {
    if (!player.assets || player.assets.length === 0) continue;

    let updatedAssets = false;
    const newAssets = player.assets.map(asset => {
      // Проверить, есть ли актив в relatedDeals
      if (relatedDeals.includes(asset.id || asset.title)) {
        updatedAssets = true;
        return {
          ...asset,
          cashFlow: (asset.cashFlow || 0) + marketCard.passiveIncome
        };
      }
      return asset;
    });

    if (updatedAssets) {
      // Пересчитать общий passiveIncome игрока
      const newPassiveIncome = newAssets.reduce((sum, asset) => sum + (asset.cashFlow || 0), 0);
      const newCashFlow = player.salary + newPassiveIncome - player.totalExpenses;

      // Обновить данные игрока
      const playerIndex = game.players.indexOf(player);
      await gameService.databaseService.getDb().collection('games').updateOne(
        { gameId },
        {
          $set: {
            [`players.${playerIndex}.assets`]: newAssets,
            [`players.${playerIndex}.passiveIncome`]: newPassiveIncome,
            [`players.${playerIndex}.totalIncome`]: player.salary + newPassiveIncome,
            [`players.${playerIndex}.cashFlow`]: newCashFlow
          }
        }
      );

      // Проверяем переход на Fast Track после обновления passiveIncome
      const transitionResult = await gameService.checkAndTransitionToFastTrack(gameId, player.userId);
      if (transitionResult.transitioned) {
        // Отправляем сообщение о переходе
        const { messageService } = services;
        const threadId = game.threadId || null;
        await messageService.sendFastTrackTransitionMessage(game.chatId, player, threadId);
      }
    }
  }
}

/**
 * Инициализирует циркуляцию market среди игроков с подходящими активами
 * @param {string} gameId - ID игры
 * @param {Object} marketCard - Market карточка
 * @param {Object} services - Объект с сервисами
 * @returns {Array} Список игроков с подходящими активами
 */
async function initializeMarketCirculation(gameId, marketCard, services) {
  const { gameService } = services;

  const game = await gameService.getGame(gameId);
  const relatedDeals = marketCard.relatedDeals || [];

  // Найти игроков с подходящими активами
  const eligiblePlayers = [];
  for (const player of game.players) {
    if (player.assets && player.assets.some(asset =>
      relatedDeals.includes(asset.id || asset.title)
    )) {
      eligiblePlayers.push(player.userId);
    }
  }

  // Определяем текущего игрока
  const currentPlayer = await gameService.getCurrentPlayer(gameId);
  const currentIndex = game.players.findIndex(p => p.userId === currentPlayer.userId);

  // Формируем список циркуляции
  const circulationPlayers = [];

  // 1. ВСЕГДА добавляем текущего игрока первым (даже если у него нет активов)
  circulationPlayers.push(currentPlayer.userId);

  // 2. Добавляем остальных игроков с активами в порядке хода
  for (let i = 1; i < game.players.length; i++) {
    const playerIndex = (currentIndex + i) % game.players.length;
    const playerId = game.players[playerIndex].userId;

    // Добавляем только если игрок имеет подходящие активы И не является текущим игроком
    if (eligiblePlayers.includes(playerId) && playerId !== currentPlayer.userId) {
      circulationPlayers.push(playerId);
    }
  }

  if (circulationPlayers.length > 0) {
    // Сохранить данные циркуляции
    await gameService.databaseService.setMarketCirculationPlayers(gameId, circulationPlayers);
    await gameService.databaseService.setMarketCirculationIndex(gameId, 0);
    await gameService.databaseService.setMarketCirculationOriginalIndex(gameId, currentIndex);
  }

  return circulationPlayers;
}

/**
 * Обрабатывает пропуск market события
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleSkipMarket(query, services) {
  const { gameService, messageService } = services;
  const chatId = query.message.chat.id;
  const threadId = getThreadId(query.message);
  const userId = query.from.id;

  try {
    const game = await gameService.getActiveGameByChatId(chatId, threadId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.', threadId);
      return;
    }

    // Проверить, что пользователь - текущий игрок
    const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!', threadId);
      return;
    }

    // Удалить кнопки
    await messageService.removeMessageKeyboard(chatId, query.message.message_id, threadId);

    // Проверить, требует ли текущая карточка взаимодействия
    const marketCard = game.currentMarket;
    const needsInteraction = marketCard ? requiresPlayerInteraction(marketCard) : false;

    if (!needsInteraction) {
      // Карточка не требует взаимодействия - сразу завершить событие
      await endMarketEvent(game.gameId, chatId, services);
    } else {
      // Карточка требует взаимодействия - перейти к следующему игроку в циркуляции
      await circulateMarketToNextPlayer(game.gameId, chatId, services);
    }

  } catch (error) {
    console.error('Error in handleSkipMarket:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при пропуске market события.', threadId);
  }
}

/**
 * Обрабатывает продажу актива по market цене
 * @param {Object} query - Callback query от Telegram
 * @param {string} assetId - ID актива для продажи
 * @param {Object} services - Объект с сервисами
 */
async function handleSellMarketAsset(query, assetId, services) {
  const { gameService, messageService } = services;
  const chatId = query.message.chat.id;
  const threadId = getThreadId(query.message);
  const userId = query.from.id;

  try {
    const game = await gameService.getActiveGameByChatId(chatId, threadId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.', threadId);
      return;
    }

    // Проверить, что пользователь - текущий игрок
    const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!', threadId);
      return;
    }

    const marketCard = game.currentMarket;
    if (!marketCard) {
      await messageService.sendErrorMessage(chatId, 'Market событие не найдено.', threadId);
      return;
    }

    // Найти актив по assetId
    const assetToSell = currentPlayer.assets.find(asset => asset.assetId === assetId);
    if (!assetToSell) {
      await messageService.sendErrorMessage(chatId, 'Актив не найден.', threadId);
      return;
    }

    // Проверить, что актив подходит для продажи по этой market карточке
    const relatedDeals = marketCard.relatedDeals || [];
    if (!relatedDeals.includes(assetToSell.id || assetToSell.title)) {
      await messageService.sendErrorMessage(chatId, 'Этот актив нельзя продать по этой market карточке.', threadId);
      return;
    }

    // Рассчитать цену продажи
    const sellPrice = calculateMarketSellPrice(marketCard, assetToSell);

    // Провести продажу
    await sellMarketAsset(game.gameId, userId, assetToSell, sellPrice, services);

    // Обновить сообщение и кнопки с карточкой маркета
    await updateMarketMessageAfterSale(chatId, query.message.message_id, game, services);

  } catch (error) {
    console.error('Error in handleSellMarketAsset:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при продаже актива.', threadId);
  }
}

/**
 * Обновляет сообщение и кнопки с карточкой маркета после продажи актива
 * @param {number} chatId - ID чата
 * @param {number} messageId - ID сообщения для обновления
 * @param {Object} game - Объект игры
 * @param {Object} currentPlayer - Объект текущего игрока
 * @param {Object} services - Объект с сервисами
 */
async function updateMarketMessageAfterSale(chatId, messageId, game, services) {
  const { gameService, messageService } = services;
  const threadId = game.threadId || null;

  const currentPlayer = await gameService.getCurrentPlayer(game.gameId);

  const marketCard = game.currentMarket;
  if (!marketCard) {
    return;
  }

  // Проверить, остались ли у игрока другие подходящие активы
  const relatedDeals = marketCard.relatedDeals || [];
  const remainingEligibleAssets = currentPlayer.assets ? currentPlayer.assets.filter(asset =>
    relatedDeals.includes(asset.id || asset.title)
  ) : [];

  if (remainingEligibleAssets.length > 0) {
    // У игрока остались активы для продажи - обновить существующее сообщение
    let message = `📈 **Рынок**\n\n`;
    message += `💼 ${marketCard.title}\n\n`;
    message += `📝 ${marketCard.description}\n\n`;

    // Показать оставшиеся активы игрока
    message += `🏠 Ваши активы:\n\n`;
    remainingEligibleAssets.forEach((asset, index) => {
      const sellPrice = calculateMarketSellPrice(marketCard, asset);
      const quantity = asset.quantity || 1;
      const totalOriginalCost = asset.cost * quantity;
      const profit = sellPrice - totalOriginalCost;
      const profitText = profit >= 0 ? `+${formatNumber(profit)}` : `${formatNumber(profit)}`;

      message += `${index + 1}. ${asset.title}\n`;
      message += `   💰 Цена продажи: ${formatNumber(sellPrice)} ₽ (${profitText} ₽)\n`;
      message += `   💵 Доход: ${formatNumber(asset.cashFlow || 0)} ₽/мес\n\n`;
    });

    message += `💰 Баланс: ${formatNumber(currentPlayer.cash)} ₽\n`;
    message += `📈 Пассивный доход: ${formatNumber(currentPlayer.passiveIncome)} ₽/мес\n`;
    message += `📉 Общие расходы: ${formatNumber(currentPlayer.totalExpenses)} ₽/мес\n`;
    message += `💹 Денежный поток: ${formatNumber(currentPlayer.cashFlow)} ₽/мес\n\n`;
    message += `Что вы хотите сделать?`;

    // Сгенерировать новую клавиатуру
    const keyboard = {
      inline_keyboard: []
    };

    // Кнопки продажи для оставшихся активов
    remainingEligibleAssets.forEach((asset) => {
      const sellPrice = calculateMarketSellPrice(marketCard, asset);
      keyboard.inline_keyboard.push([{
        text: `💸 Продать "${asset.title}" за ${formatNumber(sellPrice)} ₽`,
        callback_data: `sell_market_asset_${asset.assetId}`
      }]);
    });

    // Всегда добавить кнопку "Пропустить"
    keyboard.inline_keyboard.push([{
      text: '⏭️ Пропустить',
      callback_data: 'skip_market'
    }]);

    // Обновить сообщение
    await messageService.editMessageText(chatId, messageId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    }, threadId);
  } else {
    // У игрока не осталось подходящих активов - перейти к следующему игроку
    await messageService.removeMessageKeyboard(chatId, messageId, threadId);
    await circulateMarketToNextPlayer(game.gameId, chatId, services);
  }
}

/**
 * Рассчитывает цену продажи актива по market карточке
 * @param {Object} marketCard - Market карточка
 * @param {Object} asset - Актив для продажи
 * @returns {number} Цена продажи
 */
function calculateMarketSellPrice(marketCard, asset) {
  if (marketCard.cost) {
    return marketCard.cost;
  }

  if (marketCard.apartmentCost) {
    // Для многоквартирных домов - цена за квартиру × количество квартир
    const apartments = asset.apartments || 1;
    return apartments * marketCard.apartmentCost;
  }

  if (marketCard.costMultiple) {
    // Для партнерств - оригинальная стоимость × множитель
    return asset.cost * marketCard.costMultiple;
  }

  return 0;
}

/**
 * Продает актив игрока по market цене
 * @param {string} gameId - ID игры
 * @param {string} userId - ID игрока
 * @param {Object} asset - Актив для продажи
 * @param {number} sellPrice - Цена продажи
 * @param {Object} services - Объект с сервисами
 */
async function sellMarketAsset(gameId, userId, asset, sellPrice, services) {
  const { gameService, messageService } = services;

  const game = await gameService.getGame(gameId);
  const playerIndex = game.players.findIndex(p => p.userId === userId);
  const player = game.players[playerIndex];

  // Удалить актив из массива
  const updatedAssets = player.assets.filter(a => a.assetId !== asset.assetId);

  // Найти и закрыть связанный кредит
  let netSellPrice = sellPrice;
  let updatedLiabilities = player.liabilities || [];

  if (asset.assetLiabilityId && player.liabilities) {
    // Ищем кредит по assetLiabilityId
    const relatedLiabilityIndex = player.liabilities.findIndex(
      liability => liability.assetLiabilityId === asset.assetLiabilityId
    );

    if (relatedLiabilityIndex !== -1) {
      const liability = player.liabilities[relatedLiabilityIndex];
      // Вычитаем сумму кредита из стоимости продажи
      netSellPrice = sellPrice - liability.loanAmount;

      // Удаляем кредит
      updatedLiabilities = player.liabilities.filter((_, index) => index !== relatedLiabilityIndex);
    }
  }

  // Начислить деньги (уже с учетом кредита)
  const newCash = player.cash + netSellPrice;

  // Пересчитать финансы
  const soldCashFlow = asset.cashFlow || 0;
  const newPassiveIncome = player.passiveIncome - soldCashFlow;
  const newTotalLoanPayments = updatedLiabilities.reduce((sum, liab) => sum + (liab.monthlyPayment || 0), 0);
  const newTotalLoans = updatedLiabilities.reduce((sum, liab) => sum + (liab.loanAmount || 0), 0);
  const newTotalExpenses = player.expenses + player.childrenExpenses + newTotalLoanPayments;
  const newCashFlow = player.salary + newPassiveIncome - newTotalExpenses;

  // Обновить данные игрока
  await gameService.databaseService.getDb().collection('games').updateOne(
    { gameId },
    {
      $set: {
        [`players.${playerIndex}.cash`]: newCash,
        [`players.${playerIndex}.assets`]: updatedAssets,
        [`players.${playerIndex}.assetsCount`]: updatedAssets.length,
        [`players.${playerIndex}.passiveIncome`]: newPassiveIncome,
        [`players.${playerIndex}.totalIncome`]: player.salary + newPassiveIncome,
        [`players.${playerIndex}.liabilities`]: updatedLiabilities,
        [`players.${playerIndex}.loansCount`]: updatedLiabilities.length,
        [`players.${playerIndex}.totalLoans`]: newTotalLoans,
        [`players.${playerIndex}.totalLoanPayments`]: newTotalLoanPayments,
        [`players.${playerIndex}.totalExpenses`]: newTotalExpenses,
        [`players.${playerIndex}.cashFlow`]: newCashFlow
      }
    }
  );

  // Отправить сообщение о продаже
  const chatId = game.chatId;
  const threadId = game.threadId || null;
  await messageService.sendErrorMessage(chatId, `✅ ${player.username} продал "${asset.title}" за ${sellPrice.toLocaleString()} ₽!`, threadId);

  // Проверяем переход на Fast Track после продажи (может изменить passiveIncome и totalExpenses)
  const transitionResult = await gameService.checkAndTransitionToFastTrack(gameId, userId);
  if (transitionResult.transitioned) {
    // Получаем обновленные данные игрока
    const updatedGame = await gameService.getGame(gameId);
    const updatedPlayer = updatedGame.players.find(p => p.userId === userId);
    await messageService.sendFastTrackTransitionMessage(chatId, updatedPlayer, threadId);
  }
}

/**
 * Переходит к следующему игроку в market циркуляции
 * @param {string} gameId - ID игры
 * @param {string} chatId - ID чата
 * @param {Object} services - Объект с сервисами
 */
async function circulateMarketToNextPlayer(gameId, chatId, services) {
  const { gameService, messageService } = services;

  // Увеличить индекс циркуляции
  const incrementResult = await gameService.databaseService.incrementMarketCirculationIndex(gameId);
  if (!incrementResult.success) {
    throw new Error('Не удалось обновить индекс market циркуляции');
  }

  const game = await gameService.getGame(gameId);
  if (!game) {
    throw new Error('Игра не найдена');
  }

  if (incrementResult.completed) {
    // Все игроки совершили действия - завершить market событие
    await endMarketEvent(gameId, chatId, services);
  } else {
    // Показать карточку следующему игроку
    const nextPlayerId = game.marketCirculationPlayers[game.marketCirculationIndex];
    const nextPlayer = game.players.find(p => p.userId === nextPlayerId);

    if (!nextPlayer) {
      throw new Error('Следующий игрок не найден');
    }

    // Установить текущего игрока
    const playerIndex = game.players.findIndex(p => p.userId === nextPlayerId);
    await gameService.databaseService.getDb().collection('games').updateOne(
      { gameId },
      { $set: { currentPlayerIndex: playerIndex } }
    );

    // Показать карточку игроку с уведомлением о переходе
    const threadId = game.threadId || null;
    const customTitle = `*${nextPlayer.username}*, ваша очередь работать со сделкой`;
    await messageService.sendMarketCardWithSellOptions(chatId, game.currentMarket, nextPlayer, game, customTitle, threadId);
  }
}

/**
 * Завершает market событие
 * @param {string} gameId - ID игры
 * @param {string} chatId - ID чата
 * @param {Object} services - Объект с сервисами
 */
async function endMarketEvent(gameId, chatId, services) {
  const { gameService, messageService } = services;

  const game = await gameService.getGame(gameId);
  if (!game) {
    return;
  }

  // Очистить currentMarket и данные циркуляции
  await gameService.databaseService.setCurrentMarket(gameId, null);
  await gameService.databaseService.clearMarketCirculation(gameId);

  // Передать ход следующему игроку
  const threadId = game.threadId || null;
  const nextTurnResult = await gameService.nextTurn(gameId);
  if (nextTurnResult.success && nextTurnResult.nextPlayer) {
    if (nextTurnResult.transitioned) {
      await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer, threadId);
    }
    await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer, await gameService.getGame(gameId), threadId);
  }
}

module.exports = {
  handleMarket,
  handleSkipMarket,
  handleSellMarketAsset
};
