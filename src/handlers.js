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
 * Обрабатывает команду /endgame
 * @param {Object} msg - Сообщение Telegram
 * @param {Object} services - Объект с сервисами { gameService, messageService }
 */
async function handleEndGame(msg, services) {
  const { gameService, messageService } = services;
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // Найти незавершенную игру пользователя
    const userGames = await gameService.getUserGames(userId);
    const game = userGames.find(game => game.status !== 'finished');

    if (!game) {
      await messageService.sendEndGameErrorMessage(chatId, 'not_active');
      return;
    }

    // Если игрок один, сразу завершить игру
    if (game.players.length === 1) {
      await gameService.finishGame(game.gameId);
      await messageService.sendGameFinishedMessage(chatId, game.gameId);
      return;
    }

    // Инициировать голосование
    const messageId = await messageService.sendEndGameVoteMessage(chatId, game, [userId]);
    const result = await gameService.initiateEndGameVote(userId, game.gameId, messageId);

    if (!result.success) {
      await messageService.sendEndGameErrorMessage(chatId, result.error);
    }
  } catch (error) {
    console.error('Error in handleEndGame:', error);
    await messageService.sendEndGameErrorMessage(chatId, 'general');
  }
}

/**
 * Обрабатывает голосование за окончание игры
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами { gameService, messageService, bot }
 */
async function handleEndGameVote(query, services) {
  const { gameService, messageService, bot } = services;
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  try {
    // Найти активную игру в чате
    const activeGame = await gameService.getActiveGameByChatId(chatId);

    if (!activeGame || !activeGame.endGameMessageId) {
      await messageService.sendEndGameErrorMessage(chatId, 'not_active');
      return;
    }

    // Голосовать
    const voteResult = await gameService.voteToEndGame(userId, activeGame.gameId);

    if (!voteResult.success) {
      await messageService.sendEndGameErrorMessage(chatId, voteResult.error);
      return;
    }

    // Обновить сообщение
    const updatedGame = await gameService.getGame(activeGame.gameId);
    await messageService.updateEndGameVoteMessage(chatId, activeGame.endGameMessageId, updatedGame, updatedGame.endGameVotes);

    // Если majority достигнуто, завершить игру
    if (voteResult.shouldFinish) {
      await gameService.finishGame(activeGame.gameId);
      await messageService.sendGameFinishedMessage(chatId, activeGame.gameId);
    }
  } catch (error) {
    console.error('Error in handleEndGameVote:', error);
    await messageService.sendEndGameErrorMessage(chatId, 'general');
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
            console.log('???', existingGame, joinResult)
            await messageService.sendJoinSuccessMessage(chatId, existingGame.gameId);
            await messageService.sendPlayerCard(chatId, joinResult.player);
          } else {
            await messageService.sendJoinErrorMessage(chatId, joinResult.error);
          }
        } else {
          // Создать новую игру для чата
          const gameId = await gameService.createGame(chatId, userId, username);
          await messageService.sendGameCreatedMessage(chatId, gameId);

          // Отправить карточку игрока создателю
          const game = await gameService.getGame(gameId);
          const player = game.players.find(p => p.userId === userId);
          if (player) {
            await messageService.sendPlayerCard(chatId, player);
          }
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

      case 'end_game_vote':
        // Обработать голос за окончание игры
        await handleEndGameVote(query, services);
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
  handleEndGame,
  handleCallbackQuery
};
