/**
 * Утилита для обработки предложения сделок другим игрокам
 */

/**
 * Состояния предложения сделки
 */
const OFFER_STATES = {
  COMMISSION: 'commission',     // Выбор комиссии
  SELECT_USER: 'select_user',   // Выбор пользователя
  CONFIRMED: 'confirmed'        // Предложение подтверждено, ожидание действия
};

/**
 * Инициализирует предложение сделки
 * @param {string} gameId - ID игры
 * @param {string} offeringUserId - ID пользователя, предлагающего сделку
 * @param {Object} services - Объект с сервисами { gameService, messageService }
 */
async function initializeDealOffer(gameId, offeringUserId, services) {
  const { gameService } = services;

  // Установить начальное состояние предложения
  const offerState = {
    step: OFFER_STATES.COMMISSION,
    offeringUserId,
    commission: null,
    targetUserId: null
  };

  await gameService.databaseService.setOfferState(gameId, offerState);
}

/**
 * Обрабатывает шаг предложения сделки
 * @param {string} gameId - ID игры
 * @param {string} userId - ID пользователя
 * @param {string} chatId - ID чата
 * @param {string} action - Действие ('select_commission', 'select_user', 'cancel')
 * @param {Object} data - Данные действия (commission или targetUserId)
 * @param {Object} services - Объект с сервисами { gameService, messageService }
 */
async function processOfferStep(gameId, userId, chatId, action, data, services) {
  const { gameService, messageService } = services;

  const game = await gameService.getGame(gameId);
  if (!game) {
    throw new Error('Игра не найдена');
  }

  const offerState = game.offerState;
  if (!offerState || offerState.offeringUserId !== userId) {
    throw new Error('Предложение не найдено или доступ запрещён');
  }

  switch (action) {
    case 'select_commission':
      await handleSelectCommission(game, offerState, data.commission, services);
      break;

    case 'select_user':
      await handleSelectUser(game, offerState, data.targetUserId, services);
      break;

    case 'cancel':
      await handleCancelOffer(game, services);
      break;

    default:
      throw new Error('Неизвестное действие: ' + action);
  }
}

/**
 * Обрабатывает выбор комиссии
 * @param {Object} game - Объект игры
 * @param {Object} offerState - Текущее состояние предложения
 * @param {number} commission - Выбранная комиссия (%)
 * @param {Object} services - Объект с сервисами
 */
async function handleSelectCommission(game, offerState, commission, services) {
  const { gameService, messageService } = services;

  // Обновить состояние
  offerState.step = OFFER_STATES.SELECT_USER;
  offerState.commission = commission;

  await gameService.databaseService.setOfferState(game.gameId, offerState);

  // Получить текущего игрока
  const currentPlayer = await gameService.getCurrentPlayer(game.gameId);

  // Обновить сообщение с новым состоянием
  const content = messageService.generateDealCardContent(
    game.currentDeal,
    currentPlayer,
    game,
    game.currentDealQuantity
  );

  // Найти сообщение и обновить его
  // Предполагаем, что сообщение уже отправлено и мы обновляем его
  // В реальности нужно передать messageId или найти другой способ
}

/**
 * Обрабатывает выбор пользователя
 * @param {Object} game - Объект игры
 * @param {Object} offerState - Текущее состояние предложения
 * @param {string} targetUserId - ID выбранного пользователя
 * @param {Object} services - Объект с сервисами
 */
async function handleSelectUser(game, offerState, targetUserId, services) {
  const { gameService, messageService } = services;

  // Обновить состояние
  offerState.step = OFFER_STATES.CONFIRMED;
  offerState.targetUserId = targetUserId;

  await gameService.databaseService.setOfferState(game.gameId, offerState);

  // Создать новое сообщение со сделкой для выбранного пользователя
  const targetPlayer = game.players.find(p => p.userId === targetUserId);
  if (!targetPlayer) {
    throw new Error('Игрок не найден');
  }

  // Отправить сделку выбранному игроку
  const dealWithCommission = calculateDealWithCommission(game.currentDeal, offerState.commission);
  await messageService.sendDealCardMessage(
    game.chatId, // Предполагаем, что chatId есть в игре
    dealWithCommission,
    targetPlayer,
    game,
    game.currentDealQuantity,
    `${targetPlayer.profession} ${targetPlayer.username} вы получили предложение о сделке с комиссией ${offerState.commission}%`
  );

}

/**
 * Обрабатывает отмену предложения
 * @param {Object} game - Объект игры
 * @param {Object} services - Объект с сервисами
 */
async function handleCancelOffer(game, services) {
  const { gameService } = services;

  // Очистить состояние предложения
  await gameService.databaseService.setOfferState(game.gameId, null);
}

/**
 * Рассчитывает стоимость сделки с учётом комиссии
 * @param {Object} deal - Объект сделки
 * @param {number} commission - Комиссия в процентах
 * @returns {Object} Сделка с обновлённой стоимостью
 */
function calculateDealWithCommission(deal, commission) {
  const commissionMultiplier = 1 + (commission / 100);

  let dealWithCommission = { ...deal };

  // Рассчитать стоимость с комиссией
  if (deal.cost) {
    dealWithCommission.cost = Math.round(deal.cost * commissionMultiplier);
  }

  if (deal.downPayment) {
    dealWithCommission.downPayment = Math.round(deal.downPayment * commissionMultiplier);
  }

  // Добавить информацию о комиссии
  dealWithCommission.commission = commission;
  dealWithCommission.originalCost = deal.cost;
  dealWithCommission.originalDownPayment = deal.downPayment;

  return dealWithCommission;
}

/**
 * Рассчитывает комиссию для перевода
 * @param {Object} deal - Объект сделки
 * @param {number} commission - Комиссия в процентах
 * @returns {number} Сумма комиссии
 */
function calculateCommission(deal, commission) {
  const baseCost = deal.downPayment || deal.cost || 0;
  return Math.round(baseCost * (commission / 100));
}

/**
 * Передаёт комиссию предлагающему игроку
 * @param {string} gameId - ID игры
 * @param {string} offeringUserId - ID предлагающего игрока
 * @param {number} commissionAmount - Сумма комиссии
 * @param {Object} services - Объект с сервисами
 */
async function transferCommission(gameId, offeringUserId, commissionAmount, services) {
  const { gameService } = services;

  await gameService.databaseService.updatePlayerCash(gameId, offeringUserId, commissionAmount);
}

/**
 * Передаёт ход следующему игроку после предложения
 * @param {Object} game - Объект игры
 * @param {string} offeringUserId - ID предлагающего игрока
 * @param {Object} services - Объект с сервисами
 */
async function passTurnAfterOffer(game, offeringUserId, services) {
  const { gameService, messageService } = services;

  // Найти индекс предлагающего игрока
  const offeringPlayerIndex = game.players.findIndex(p => p.userId === offeringUserId);

  // Следующий игрок
  const nextPlayerIndex = (offeringPlayerIndex + 1) % game.players.length;
  const nextPlayer = game.players[nextPlayerIndex];

  // Установить текущего игрока
  await gameService.databaseService.getDb().collection('games').updateOne(
    { gameId: game.gameId },
    { $set: { currentPlayerIndex: nextPlayerIndex, diceRolledThisTurn: false } }
  );

  // Отправить сообщение о ходе
  await messageService.sendPlayerTurnMessage(game.chatId, nextPlayer, await gameService.getGame(game.gameId));
}

module.exports = {
  OFFER_STATES,
  initializeDealOffer,
  processOfferStep,
  calculateDealWithCommission,
  calculateCommission,
  transferCommission,
  passTurnAfterOffer
};
