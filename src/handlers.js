/**
 * Модуль обработчиков команд Telegram бота
 * Отвечает за обработку входящих команд, валидацию данных
 * и координацию между gameService и messageService
 */

/**
 * Обрабатывает команду /start
 * @param {Object} msg - Сообщение Telegram
 * @param {Object} services - Объект с сервисами { messageService }
 */
async function handleStart(msg, services) {
  const { messageService } = services;
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || msg.from.username || 'игрок';

  await messageService.sendWelcomeMessage(chatId, userName);
}

/**
 * Обрабатывает команду /help
 * @param {Object} msg - Сообщение Telegram
 * @param {Object} services - Объект с сервисами { messageService }
 */
async function handleHelp(msg, services) {
  const { messageService } = services;
  const chatId = msg.chat.id;

  await messageService.sendHelpMessage(chatId);
}

/**
 * Обрабатывает команду /newgame
 * @param {Object} msg - Сообщение Telegram
 * @param {Object} services - Объект с сервисами { gameService, messageService }
 */
async function handleNewGame(msg, services) {
  const { gameService, messageService } = services;
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.first_name || msg.from.username || 'игрок';

  try {
    const gameId = await gameService.createGame(chatId, userId, username);
    await messageService.sendGameCreatedMessage(chatId, gameId);
  } catch (error) {
    console.error('Error in handleNewGame:', error);
    await messageService.sendGameCreationErrorMessage(chatId);
  }
}

/**
 * Обрабатывает команду /play
 * @param {Object} msg - Сообщение Telegram
 * @param {Array} match - Результат парсинга команды (match[1] = gameId)
 * @param {Object} services - Объект с сервисами { gameService, messageService }
 */
async function handlePlay(msg, match, services) {
  const { gameService, messageService } = services;
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const gameId = match[1];

  // Валидация gameId
  if (!gameId || gameId.trim() === '') {
    await messageService.sendPlayErrorMessage(chatId, 'general');
    return;
  }

  try {
    const result = await gameService.startGame(userId, gameId);

    if (result.success) {
      await messageService.sendPlaySuccessMessage(chatId, gameId);
    } else {
      await messageService.sendPlayErrorMessage(chatId, result.error);
    }
  } catch (error) {
    console.error('Error in handlePlay:', error);
    await messageService.sendPlayErrorMessage(chatId, 'general');
  }
}

/**
 * Обрабатывает callback_query от inline кнопок
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами { gameService, messageService, bot }
 */
async function handleCallbackQuery(query, services) {
  const { gameService, messageService, bot } = services;
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const username = query.from.first_name || query.from.username || 'игрок';
  const data = query.data;

  // Подтверждаем получение callback
  await bot.answerCallbackQuery(query.id);

  try {
    switch (data) {
      case 'play':
        // Проверить наличие активной игры для чата
        const existingGame = await gameService.getActiveGameByChatId(chatId);
        if (existingGame) {
          // Присоединиться к существующей игре
          const joinResult = await gameService.joinGame(userId, existingGame.gameId, username);
          if (joinResult.success) {
            await messageService.sendJoinSuccessMessage(chatId, existingGame.gameId);
            await messageService.sendPlayerCard(chatId, joinResult.player);
          } else {
            await messageService.sendJoinErrorMessage(chatId, joinResult.error);
          }
        } else {
          // Создать новую игру для чата
          const gameId = await gameService.createGame(chatId, userId, username);
          await messageService.sendGameCreatedMessage(chatId, gameId);
        }
        break;

      case 'rules':
        // Показать правила
        await messageService.sendRulesMessage(chatId);
        break;

      case 'help':
        // Показать помощь
        await messageService.sendHelpMessage(chatId);
        break;

      default:
        console.warn('Unknown callback data:', data);
    }
  } catch (error) {
    console.error('Error in handleCallbackQuery:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка. Попробуйте еще раз.');
  }
}

module.exports = {
  handleStart,
  handleHelp,
  handleNewGame,
  handlePlay,
  handleCallbackQuery
};
