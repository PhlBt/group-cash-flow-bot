const { formatNumber } = require('../utils');
const { FIELD_TYPES } = require('../game/board');

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
    // Найти незавершенную игру пользователя в текущем чате
    const userGames = await gameService.getUserGames(userId);
    const game = userGames.find(game => game.status !== 'finished' && game.chatId === chatId);

    if (!game) {
      await messageService.sendEndGameErrorMessage(chatId, 'not_active');
      return;
    }

    // Если игроков меньше 3, сразу завершить игру
    if (game.players.length < 3) {
      await gameService.finishGame(game.gameId);
      await messageService.sendGameFinishedMessage(chatId);
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
 * Обрабатывает команду /profile
 * @param {Object} msg - Сообщение Telegram
 * @param {Object} services - Объект с сервисами { gameService, messageService, userStatsService }
 */
async function handleProfile(msg, services) {
  const { gameService, messageService, userStatsService } = services;
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // Получить статистику пользователя
    const userStats = await userStatsService.getOrCreateUserStats(userId, msg.from.first_name || msg.from.username || 'игрок');

    // Проверить наличие активной игры в чате
    const activeGame = await gameService.getActiveGameByChatId(chatId);

    if (activeGame) {
      // Найти игрока в игре
      const player = activeGame.players.find(p => p.userId === userId);
      if (player) {
        // Показать полную карточку игрока
        await messageService.sendPlayerCard(chatId, player, userStats);
      } else {
        // Пользователь не в игре, показать только статистику
        await messageService.sendPlayerCard(chatId, null, userStats);
      }
    } else {
      // Нет активной игры, показать только статистику
      await messageService.sendPlayerCard(chatId, null, userStats);
    }
  } catch (error) {
    console.error('Error in handleProfile:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при загрузке профиля.');
  }
}

/**
 * Обрабатывает команду /rules
 * @param {Object} msg - Сообщение Telegram
 * @param {Object} services - Объект с сервисами { messageService }
 */
async function handleRules(msg, services) {
  const { messageService } = services;
  const chatId = msg.chat.id;

  await messageService.sendRulesMessage(chatId);
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

    if (!activeGame) {
      await messageService.sendEndGameErrorMessage(chatId, 'not_active');
      return;
    }

    // Если нет ongoing голосования, инициировать новое
    if (!activeGame.endGameVotes || activeGame.endGameVotes.length === 0) {
      // Инициировать новое голосование
      const messageId = await messageService.sendEndGameVoteMessage(chatId, activeGame, [userId]);
      const result = await gameService.initiateEndGameVote(userId, activeGame.gameId, messageId);

      if (!result.success) {
        await messageService.sendEndGameErrorMessage(chatId, result.error);
        return;
      }

      // Проверить, достигнуто ли большинство после инициации
      const updatedGame = await gameService.getGame(activeGame.gameId);
      const majority = Math.ceil(updatedGame.players.length / 2);
      if (updatedGame.endGameVotes.length >= majority) {
        await gameService.finishGame(activeGame.gameId);
        await messageService.sendGameFinishedMessage(chatId);
        if (updatedGame.endGameMessageId) {
          await messageService.deleteMessage(chatId, updatedGame.endGameMessageId);
        }
      }
      return;
    }

    // Голосовать в существующем голосовании
    const voteResult = await gameService.voteToEndGame(userId, activeGame.gameId);

    if (!voteResult.success) {
      await messageService.sendEndGameErrorMessage(chatId, voteResult.error);
      return;
    }

    // Обновить сообщение голосования
    const updatedGame = await gameService.getGame(activeGame.gameId);
    await messageService.updateEndGameVoteMessage(chatId, activeGame.endGameMessageId, updatedGame, updatedGame.endGameVotes);

    // Если majority достигнуто, завершить игру
    if (voteResult.shouldFinish) {
      await gameService.finishGame(activeGame.gameId);
      await messageService.sendGameFinishedMessage(chatId);
      if (updatedGame.endGameMessageId) {
        await messageService.deleteMessage(chatId, updatedGame.endGameMessageId);
      }
    }
  } catch (error) {
    console.error('Error in handleEndGameVote:', error);
    await messageService.sendEndGameErrorMessage(chatId, 'general');
  }
}

module.exports = {
  handleStart,
  handleHelp,
  handleNewGame,
  handlePlay,
  handleEndGame,
  handleProfile,
  handleRules,
  handleEndGameVote
};
