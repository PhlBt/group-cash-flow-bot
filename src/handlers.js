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
  const userName = msg.from.first_name || 'игрок';

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

  try {
    const gameId = await gameService.createGame(userId);
    await messageService.sendGameCreatedMessage(chatId, gameId);
  } catch (error) {
    console.error('Error in handleNewGame:', error);
    await messageService.sendGameCreationErrorMessage(chatId);
  }
}

/**
 * Обрабатывает команду /join
 * @param {Object} msg - Сообщение Telegram
 * @param {Array} match - Результат парсинга команды (match[1] = gameId)
 * @param {Object} services - Объект с сервисами { gameService, messageService }
 */
async function handleJoin(msg, match, services) {
  const { gameService, messageService } = services;
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const gameId = match[1];

  // Валидация gameId
  if (!gameId || gameId.trim() === '') {
    await messageService.sendJoinErrorMessage(chatId, 'general');
    return;
  }

  try {
    const result = await gameService.joinGame(userId, gameId);

    if (result.success) {
      await messageService.sendJoinSuccessMessage(chatId, gameId);
    } else {
      await messageService.sendJoinErrorMessage(chatId, result.error);
    }
  } catch (error) {
    console.error('Error in handleJoin:', error);
    await messageService.sendJoinErrorMessage(chatId, 'general');
  }
}

module.exports = {
  handleStart,
  handleHelp,
  handleNewGame,
  handleJoin
};
