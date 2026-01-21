/**
 * Обработчики для market событий
 */

const { markets } = require('../game/cards/markets');
const { applyInflation } = require('../utils');

/**
 * Обрабатывает попадание на поле Market
 * @param {string} gameId - ID игры
 * @param {string} userId - ID пользователя
 * @param {Object} services - Объект с сервисами { gameService, messageService }
 */
async function handleMarket(gameId, services) {
  const { gameService } = services;

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

  // Запустить циркуляцию для эффектов продажи (если есть игроки с активами)
  await initializeMarketCirculation(gameId, marketCard, services);

  // Вернуть карточку для отображения в комбинированном сообщении

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

  if (eligiblePlayers.length > 0) {
    // Установить циркуляцию начиная с текущего игрока
    const currentPlayer = await gameService.getCurrentPlayer(gameId);
    const currentIndex = game.players.findIndex(p => p.userId === currentPlayer.userId);

    // Создать список циркуляции
    const circulationPlayers = [];
    for (let i = 0; i < game.players.length; i++) {
      const playerIndex = (currentIndex + i) % game.players.length;
      const playerId = game.players[playerIndex].userId;
      if (eligiblePlayers.includes(playerId)) {
        circulationPlayers.push(playerId);
      }
    }

    // Сохранить данные циркуляции
    await gameService.databaseService.setMarketCirculationPlayers(gameId, circulationPlayers);
    await gameService.databaseService.setMarketCirculationIndex(gameId, 0);
    await gameService.databaseService.setMarketCirculationOriginalIndex(gameId, currentIndex);
  }

  return eligiblePlayers;
}

/**
 * Обрабатывает пропуск market события
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleSkipMarket(query, services) {
  const { gameService, messageService } = services;
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  try {
    const game = await gameService.getActiveGameByChatId(chatId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.');
      return;
    }

    // Проверить, что пользователь - текущий игрок
    const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!');
      return;
    }

    // Удалить кнопки
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Перейти к следующему игроку в циркуляции
    await circulateMarketToNextPlayer(game.gameId, chatId, services);

  } catch (error) {
    console.error('Error in handleSkipMarket:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при пропуске market события.');
  }
}

/**
 * Обрабатывает продажу актива по market цене
 * @param {Object} query - Callback query от Telegram
 * @param {number} assetIndex - Индекс актива в списке подходящих
 * @param {Object} services - Объект с сервисами
 */
async function handleSellMarketAsset(query, assetIndex, services) {
  const { gameService, messageService } = services;
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  try {
    const game = await gameService.getActiveGameByChatId(chatId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.');
      return;
    }

    // Проверить, что пользователь - текущий игрок
    const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!');
      return;
    }

    const marketCard = game.currentMarket;
    if (!marketCard) {
      await messageService.sendErrorMessage(chatId, 'Market событие не найдено.');
      return;
    }

    // Найти подходящие активы игрока
    const relatedDeals = marketCard.relatedDeals || [];
    const eligibleAssets = currentPlayer.assets.filter(asset =>
      relatedDeals.includes(asset.id || asset.title)
    );

    if (assetIndex >= eligibleAssets.length) {
      await messageService.sendErrorMessage(chatId, 'Актив не найден.');
      return;
    }

    const assetToSell = eligibleAssets[assetIndex];

    // Рассчитать цену продажи
    const sellPrice = calculateMarketSellPrice(marketCard, assetToSell);

    // Провести продажу
    await sellMarketAsset(game.gameId, userId, assetToSell, sellPrice, services);

    // Удалить кнопки
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Перейти к следующему игроку в циркуляции
    await circulateMarketToNextPlayer(game.gameId, chatId, services);

  } catch (error) {
    console.error('Error in handleSellMarketAsset:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при продаже актива.');
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
  const updatedAssets = player.assets.filter(a => a !== asset);

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
  await messageService.sendErrorMessage(chatId, `✅ ${player.username} продал "${asset.title}" за ${sellPrice.toLocaleString()} ₽!`);
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
    const customTitle = `*${nextPlayer.username}*, ваша очередь работать со сделкой`;
    await messageService.sendMarketCardWithSellOptions(chatId, game.currentMarket, nextPlayer, game, customTitle);
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
  const nextTurnResult = await gameService.nextTurn(gameId);
  if (nextTurnResult.success && nextTurnResult.nextPlayer) {
    if (nextTurnResult.transitioned) {
      await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer);
    }
    await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
  }
}

module.exports = {
  handleMarket,
  handleSkipMarket,
  handleSellMarketAsset
};
