// Утилиты больше не нужны - логика форматирования в MessageService

/**
 * Обрабатывает запрос профиля игрока
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleProfile(query, services) {
  const { gameService, messageService } = services;
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  try {
    // Найти активную игру в чате
    const game = await gameService.getActiveGameByChatId(chatId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.');
      return;
    }

    // Найти игрока
    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      await messageService.sendErrorMessage(chatId, 'Игрок не найден в игре.');
      return;
    }

    // Отправить профиль игрока
    await messageService.sendPlayerProfileMessage(chatId, player);

  } catch (error) {
    console.error('Error in handleProfile:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при загрузке профиля.');
  }
}

/**
 * Обрабатывает запрос статистики игры
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleStats(query, services) {
  const { gameService, messageService } = services;
  const chatId = query.message.chat.id;

  try {
    // Найти активную игру в чате
    const game = await gameService.getActiveGameByChatId(chatId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.');
      return;
    }

    // Отправить статистику игры
    await messageService.sendGameStatsMessage(chatId, game);

  } catch (error) {
    console.error('Error in handleStats:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при загрузке статистики.');
  }
}

/**
 * Обрабатывает запрос активов игрока
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleAssets(query, services) {
  const { gameService, messageService } = services;
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  try {
    // Найти активную игру в чате
    const game = await gameService.getActiveGameByChatId(chatId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.');
      return;
    }

    // Найти игрока
    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      await messageService.sendErrorMessage(chatId, 'Игрок не найден в игре.');
      return;
    }

    // Делегировать отправку в MessageService
    await messageService.sendPlayerAssetsMessage(chatId, player);

  } catch (error) {
    console.error('Error in handleAssets:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при загрузке активов.');
  }
}

/**
 * Обрабатывает запрос кредитов игрока
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleCredits(query, services) {
  const { gameService, messageService } = services;
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  try {
    // Найти активную игру в чате
    const game = await gameService.getActiveGameByChatId(chatId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.');
      return;
    }

    // Найти игрока
    const player = game.players.find(p => p.userId === userId);
    if (!player) {
      await messageService.sendErrorMessage(chatId, 'Игрок не найден в игре.');
      return;
    }

    // Делегировать отправку в MessageService
    await messageService.sendPlayerCreditsMessage(chatId, player);

  } catch (error) {
    console.error('Error in handleCredits:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при загрузке кредитов.');
  }
}

module.exports = {
  handleProfile,
  handleStats,
  handleAssets,
  handleCredits
};
