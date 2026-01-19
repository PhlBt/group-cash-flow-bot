/**
 * Утилита для обработки циркуляции карт anyCanBuySell между игроками
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

  // Создать массив всех игроков
  const allPlayers = game.players.map(p => p.userId);

  if (allPlayers.length > 0) {
    // Установить список игроков для циркуляции
    await gameService.databaseService.setDealCirculationPlayers(gameId, allPlayers);
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

  if (action === 'buy' || action === 'sell') {
    // Для покупки/продажи - завершить циркуляцию и продолжить игру
    await endDealCirculation(gameId, services);
    const nextTurnResult = await gameService.nextTurn(gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
    }
  } else if (action === 'skip') {
    // Для пропуска - перейти к следующему игроку в списке циркуляции
    await circulateToNextPlayer(gameId, chatId, services);
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
    await endDealCirculation(gameId, services);
    const nextTurnResult = await gameService.nextTurn(gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
    }
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
 * @param {Object} services - Объект с сервисами { gameService }
 */
async function endDealCirculation(gameId, services) {
  const { gameService } = services;

  // Очистить currentDeal
  await gameService.databaseService.setCurrentDeal(gameId, null);

  // Очистить данные циркуляции
  await gameService.databaseService.clearDealCirculation(gameId);
}

module.exports = {
  initializeDealCirculation,
  processDealAction,
  circulateToNextPlayer,
  endDealCirculation
};
