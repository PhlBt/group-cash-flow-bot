// Утилиты больше не нужны - логика форматирования в MessageService

/**
 * Обрабатывает запрос профиля игрока
 * @param {Object} input - Сообщение Telegram или Callback query
 * @param {Object} services - Объект с сервисами
 */
async function handleProfile(input, services) {
  const { gameService, messageService, userStatsService } = services;

  // Определяем тип входных данных и извлекаем chatId и userId
  const userId = input.from.id
  const username = input.from.first_name || input.from.username || 'игрок';
  const chatId = (input.message) ? input.message.chat.id : input.chat.id

  try {
    if (input.message) {
      // Callback query - требуется активная игра
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

      // Проверить, что сейчас ход игрока
      const { validateCurrentPlayer } = require('../utils/validators');
      const currentPlayer = await validateCurrentPlayer(game.gameId, userId, { gameService, messageService }, chatId);
      if (!currentPlayer) {
        return;
      }

      // Получить статистику игрока
      const userStats = await userStatsService.getOrCreateUserStats(userId, username);

      // Отправить профиль игрока
      await messageService.sendPlayerProfileMessage(chatId, player, userStats);
    } else {
      // Message от команды - показать статистику пользователя
      const userStats = await userStatsService.getOrCreateUserStats(userId, username);

      // Проверить наличие активной игры в чате
      const activeGame = await gameService.getActiveGameByChatId(chatId);

      if (activeGame) {
        // Найти игрока в игре
        const player = activeGame.players.find(p => p.userId === userId);
        if (player) {
          // Показать профиль игрока с кнопками активов и кредитов
          await messageService.sendPlayerProfileMessage(chatId, player, userStats);
        } else {
          // Пользователь не в игре, показать только статистику
          await messageService.sendPlayerCard(chatId, null, userStats);
        }
      } else {
        // Нет активной игры, показать только статистику
        await messageService.sendPlayerCard(chatId, null, userStats);
      }
    }

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

    // Проверить, что сейчас ход игрока
    const { validateCurrentPlayer } = require('../utils/validators');
    const currentPlayer = await validateCurrentPlayer(game.gameId, userId, { gameService, messageService }, chatId);
    if (!currentPlayer) {
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

    // Проверить, что сейчас ход игрока
    const { validateCurrentPlayer } = require('../utils/validators');
    const currentPlayer = await validateCurrentPlayer(game.gameId, userId, { gameService, messageService }, chatId);
    if (!currentPlayer) {
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
