/**
 * Утилита для обработки циркуляции карт anyCanBuySell и canSellStocks между игроками
 */

/**
 * Находит игроков, владеющих активами с указанным group_id
 * @param {Object} game - Объект игры
 * @param {string} groupId - ID группы активов
 * @returns {Array} Массив userId игроков
 */
function findPlayersWithGroupAssets(game, groupId) {
  const playersWithAssets = [];

  for (const player of game.players) {
    if (player.assets && player.assets.some(asset => asset.group_Id === groupId)) {
      playersWithAssets.push(player.userId);
    }
  }

  return playersWithAssets;
}

/**
 * Инициализирует циркуляцию anyCanBuySell карты
 * @param {string} gameId - ID игры
 * @param {Object} deal - Объект сделки
 * @param {Object} services - Объект с сервисами { gameService, messageService }
 */
async function initializeDealCirculation(gameId, deal, services) {
  const { gameService } = services;

  const game = await gameService.getGame(gameId);
  if (!game) {
    return;
  }

  // Создать массив игроков, начиная с текущего игрока
  const currentIndex = game.currentPlayerIndex;
  const circulationPlayers = [];
  for (let i = 0; i < game.players.length; i++) {
    const playerIndex = (currentIndex + i) % game.players.length;
    circulationPlayers.push(game.players[playerIndex].userId);
  }

  if (circulationPlayers.length > 0) {
    // Установить список игроков для циркуляции
    await gameService.databaseService.setDealCirculationPlayers(gameId, circulationPlayers);
    // Сохранить оригинальный индекс текущего игрока
    await gameService.databaseService.setDealCirculationOriginalIndex(gameId, currentIndex);
  }
}

/**
 * Обрабатывает действие с картой anyCanBuySell
 * @param {string} gameId - ID игры
 * @param {string} userId - ID пользователя
 * @param {string} chatId - ID чата
 * @param {string} action - Тип действия ('buy', 'sell', 'skip')
 * @param {Object} services - Объект с сервисами { gameService, messageService }
 */
async function processDealAction(gameId, userId, chatId, action, services) {
  const { gameService, messageService } = services;

  // Получить игру и текущую сделку
  const game = await gameService.getGame(gameId);
  if (!game) {
    throw new Error('Игра не найдена');
  }

  const deal = game.currentDeal;
  if (!deal || !deal.anyCanBuySell) {
    throw new Error('Сделка не найдена или не поддерживает циркуляцию');
  }

  // Проверить, что пользователь - текущий игрок
  const currentPlayer = await gameService.getCurrentPlayer(gameId);
  if (!currentPlayer || currentPlayer.userId !== userId) {
    throw new Error('Сейчас не ваш ход!');
  }

  if (action === 'buy' || action === 'skip' || action === 'sell') {
    // Для покупки или пропуска - перейти к следующему игроку
    await circulateToNextPlayer(game.gameId, chatId, services);
  } else {
    throw new Error('Неизвестное действие: ' + action);
  }
}

/**
 * Циркулирует карту к следующему игроку из списка
 * @param {string} gameId - ID игры
 * @param {string} chatId - ID чата
 * @param {Object} services - Объект с сервисами { gameService, messageService }
 */
async function circulateToNextPlayer(gameId, chatId, services) {
  const { gameService, messageService } = services;

  // Увеличить индекс циркуляции
  const incrementResult = await gameService.databaseService.incrementDealCirculationIndex(gameId);
  if (!incrementResult.success) {
    throw new Error('Не удалось обновить индекс циркуляции');
  }

  const game = await gameService.getGame(gameId);
  if (!game) {
    throw new Error('Игра не найдена');
  }

  const deal = game.currentDeal;
  if (!deal) {
    throw new Error('Текущая сделка не найдена');
  }

  if (incrementResult.completed) {
    // Все игроки из списка совершили действия - завершить циркуляцию
    await endDealCirculation(gameId, chatId, services);
  } else {
    // Показать карту следующему игроку из списка
    const nextPlayerId = game.dealCirculationPlayers[game.dealCirculationIndex];
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

    // Показать карту игроку с кастомным заголовком
    await messageService.sendDealCardMessage(
      chatId,
      deal,
      nextPlayer,
      game,
      game.currentDealQuantity,
      `*${nextPlayer.username}*, ваша очередь работать со сделкой`
    );
  }
}

/**
 * Завершает циркуляцию сделки (очищает currentDeal и данные циркуляции)
 * @param {string} gameId - ID игры
 * @param {string} chatId - ID чата
 * @param {Object} services - Объект с сервисами { gameService, messageService }
 */
async function endDealCirculation(gameId, chatId, services) {
  const { gameService, messageService } = services;

  const game = await gameService.getGame(gameId);
  if (!game) {
    throw new Error('Игра не найдена');
  }

  // Установить ход следующему игроку после оригинального
  const nextPlayerIndex = (game.dealCirculationOriginalIndex + 1) % game.players.length;
  await gameService.databaseService.getDb().collection('games').updateOne(
    { gameId },
    { $set: { currentPlayerIndex: nextPlayerIndex, diceRolledThisTurn: false } }
  );

  // Очистить currentDeal
  await gameService.databaseService.setCurrentDeal(gameId, null);

  // Очистить данные циркуляции
  await gameService.databaseService.clearDealCirculation(gameId);

  // Отправить сообщение о ходе следующего игрока
  const nextPlayer = game.players[nextPlayerIndex];
  await messageService.sendPlayerTurnMessage(chatId, nextPlayer, await gameService.getGame(game.gameId));
}

/**
 * Инициализирует циркуляцию canSellStocks карты
 * @param {string} gameId - ID игры
 * @param {Object} deal - Объект сделки
 * @param {Object} services - Объект с сервисами { gameService, messageService }
 */
async function initializeCanSellStocksCirculation(gameId, deal, services) {
  const { gameService } = services;

  const game = await gameService.getGame(gameId);
  if (!game) {
    return;
  }

  // Найти игроков с активами этого group_Id
  const playersWithAssets = findPlayersWithGroupAssets(game, deal.group_Id);

  // Оригинальный игрок всегда включается, даже если у него нет активов
  const originalPlayerId = game.players[game.currentPlayerIndex].userId;
  const circulationPlayers = [originalPlayerId, ...playersWithAssets.filter(id => id !== originalPlayerId)];

  if (circulationPlayers.length > 0) {
    // Установить список игроков для циркуляции
    await gameService.databaseService.setDealCirculationPlayers(gameId, circulationPlayers);
    // Сохранить оригинальный индекс текущего игрока
    await gameService.databaseService.setDealCirculationOriginalIndex(gameId, game.currentPlayerIndex);
  }
}

/**
 * Обрабатывает действие с картой canSellStocks
 * @param {string} gameId - ID игры
 * @param {string} userId - ID пользователя
 * @param {string} chatId - ID чата
 * @param {string} action - Тип действия ('buy', 'sell', 'skip')
 * @param {Object} services - Объект с сервисами { gameService, messageService }
 */
async function processCanSellStocksAction(gameId, userId, chatId, action, services) {
  const { gameService, messageService } = services;

  // Получить игру и текущую сделку
  const game = await gameService.getGame(gameId);
  if (!game) {
    throw new Error('Игра не найдена');
  }

  const deal = game.currentDeal;
  if (!deal || !deal.canSellStocks) {
    throw new Error('Сделка не найдена или не поддерживает продажу акций');
  }

  // Проверить, что пользователь - текущий игрок
  const currentPlayer = await gameService.getCurrentPlayer(gameId);
  if (!currentPlayer || currentPlayer.userId !== userId) {
    throw new Error('Сейчас не ваш ход!');
  }

  // Определить, является ли игрок оригинальным
  const originalPlayerIndex = game.dealCirculationOriginalIndex;
  const isOriginalPlayer = game.currentPlayerIndex === originalPlayerIndex;

  if (action === 'buy') {
    if (!isOriginalPlayer) {
      throw new Error('Только оригинальный игрок может покупать акции');
    }
    // Для покупки (только оригинальным игроком) - перейти к следующему игроку
    await circulateCanSellStocksToNextPlayer(game.gameId, chatId, services);
  } else if (action === 'skip' || action === 'sell') {
    // Для пропуска - перейти к следующему игроку
    await circulateCanSellStocksToNextPlayer(game.gameId, chatId, services);
  } else {
    throw new Error('Неизвестное действие: ' + action);
  }
}

/**
 * Циркулирует карту canSellStocks к следующему игроку из списка
 * @param {string} gameId - ID игры
 * @param {string} chatId - ID чата
 * @param {Object} services - Объект с сервисами { gameService, messageService }
 */
async function circulateCanSellStocksToNextPlayer(gameId, chatId, services) {
  const { gameService, messageService } = services;

  // Увеличить индекс циркуляции
  const incrementResult = await gameService.databaseService.incrementDealCirculationIndex(gameId);
  if (!incrementResult.success) {
    throw new Error('Не удалось обновить индекс циркуляции');
  }

  const game = await gameService.getGame(gameId);
  if (!game) {
    throw new Error('Игра не найдена');
  }

  const deal = game.currentDeal;
  if (!deal) {
    throw new Error('Текущая сделка не найдена');
  }

  if (incrementResult.completed) {
    // Все игроки из списка совершили действия - завершить циркуляцию
    await endDealCirculation(gameId, chatId, services);
  } else {
    // Показать карту следующему игроку из списка
    const nextPlayerId = game.dealCirculationPlayers[game.dealCirculationIndex];
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

    // Определить, является ли следующий игрок оригинальным
    const isOriginalPlayer = game.dealCirculationIndex === 0; // Первый в списке - оригинальный

    // Показать карту игроку с кастомным заголовком
    const customTitle = `*${nextPlayer.username}*, ваша очередь работать со сделкой`;
    await messageService.sendDealCardMessage(
      chatId,
      deal,
      nextPlayer,
      game,
      isOriginalPlayer ? game.currentDealQuantity : 1, // Для неоригинальных - всегда 1
      customTitle
    );
  }
}

module.exports = {
  initializeDealCirculation,
  processDealAction,
  circulateToNextPlayer,
  endDealCirculation,
  initializeCanSellStocksCirculation,
  processCanSellStocksAction,
  circulateCanSellStocksToNextPlayer
};
