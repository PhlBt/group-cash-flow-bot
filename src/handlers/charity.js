const { formatNumber, getThreadId } = require('../utils');

/**
 * Обрабатывает попадание игрока на поле благотворительности
 * @param {string} gameId - ID игры
 * @param {string} userId - ID игрока
 * @param {Object} services - Объект с сервисами
 */
async function handleCharity(gameId, userId, services) {
  const { gameService } = services;

  try {
    // Найти игру
    const game = await gameService.getGame(gameId);
    if (!game) {
      throw new Error('Игра не найдена');
    }

    // Получить текущего игрока
    const currentPlayer = await gameService.getCurrentPlayer(gameId);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      throw new Error('Не ваш ход');
    }

    // Показать комбинированное сообщение с полем благотворительности
    const threadId = game.threadId || null;
    await services.messageService.sendCombinedRollMoveCharityMessage(
      services.bot,
      currentPlayer,
      game,
      threadId
    );

  } catch (error) {
    console.error('Error in handleCharity:', error);
    throw error;
  }
}

/**
 * Обрабатывает пожертвование на благотворительность
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleDonateCharity(query, services) {
  const { gameService, messageService } = services;
  const chatId = query.message.chat.id;
  const threadId = getThreadId(query.message);
  const userId = query.from.id;

  try {
    // Найти активную игру в чате
    const game = await gameService.getActiveGameByChatId(chatId, threadId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.', threadId);
      return;
    }

    // Проверить, что пользователь - текущий игрок
    const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!', threadId);
      return;
    }

    // Пожертвовать 10% дохода
    const donateResult = await gameService.donateCharity(game.gameId, userId);
    if (!donateResult.success) {
      await messageService.sendErrorMessage(chatId, 'Ошибка при пожертвовании: ' + donateResult.error, threadId);
      return;
    }

    // Удалить кнопки с сообщения выбора благотворительности
    await messageService.removeMessageKeyboard(chatId, query.message.message_id, threadId);

    // Отправить сообщение об успешном пожертвовании
    const donationAmount = formatNumber(donateResult.donationAmount);
    const remainingTurns = donateResult.turnsLeft;

    if (currentPlayer.isFastTrack) {
      await messageService.sendErrorMessage(chatId, `✅ ${currentPlayer.username} пожертвовал ${donationAmount} ₽ на благотворительность!\n🎲 До конца игры можно бросать 1, 2 или 3 кубика.`, threadId);
    } else {
      await messageService.sendErrorMessage(chatId, `✅ ${currentPlayer.username} пожертвовал ${donationAmount} ₽ на благотворительность!\n🎲 На следующих ${remainingTurns} ходах можно бросать 1 или 2 кубика.`, threadId);
    }

    // Передать ход следующему игроку
    const nextTurnResult = await gameService.nextTurn(game.gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      if (nextTurnResult.transitioned) {
        await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer, threadId);
      }
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer, await gameService.getGame(game.gameId), threadId);
    }

  } catch (error) {
    console.error('Error in handleDonateCharity:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при пожертвовании.', threadId);
  }
}

/**
 * Обрабатывает пропуск благотворительности
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleSkipCharity(query, services) {
  const { gameService, messageService } = services;
  const chatId = query.message.chat.id;
  const threadId = getThreadId(query.message);
  const userId = query.from.id;

  try {
    // Найти активную игру в чате
    const game = await gameService.getActiveGameByChatId(chatId, threadId);
    if (!game) {
      await messageService.sendErrorMessage(chatId, 'Игра не найдена или не активна.', threadId);
      return;
    }

    // Проверить, что пользователь - текущий игрок
    const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!', threadId);
      return;
    }

    // Удалить кнопки с сообщения выбора благотворительности
    await messageService.removeMessageKeyboard(chatId, query.message.message_id, threadId);

    // Передать ход следующему игроку
    const nextTurnResult = await gameService.nextTurn(game.gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      if (nextTurnResult.transitioned) {
        await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer, threadId);
      }
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer, await gameService.getGame(game.gameId), threadId);
    }

  } catch (error) {
    console.error('Error in handleSkipCharity:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при пропуске благотворительности.', threadId);
  }
}

module.exports = {
  handleCharity,
  handleDonateCharity,
  handleSkipCharity
};
