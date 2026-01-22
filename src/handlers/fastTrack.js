const { formatNumber } = require('../utils');

/**
 * Обрабатывает попадание игрока на поле fastTrack
 * @param {string} gameId - ID игры
 * @param {string} userId - ID игрока
 * @param {Object} fieldData - Данные поля fastTrack
 * @param {Object} services - Объект с сервисами
 */
async function handleFastTrack(gameId, userId, fieldData, services) {
  const { gameService, messageService } = services;

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

    // Сохранить fastTrack событие в состоянии игры
    await gameService.databaseService.setCurrentFastTrack(gameId, fieldData);

  } catch (error) {
    console.error('Error in handleFastTrack:', error);
    throw error;
  }
}

/**
 * Обрабатывает оплату fastTrack события
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handlePayFastTrack(query, services) {
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

    // Получить сохраненное fastTrack событие
    const fastTrackEvent = game.currentFastTrack;
    if (!fastTrackEvent) {
      await messageService.sendErrorMessage(chatId, 'Событие fastTrack не найдено. Попробуйте еще раз.');
      return;
    }

    // Проверить, что пользователь - текущий игрок
    const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!');
      return;
    }

    // Обработать разные типы fastTrack событий
    if (fastTrackEvent.expenseBalanceMultiply) {
      // Оплата процента от баланса - списывается все, если денег недостаточно
      const calculatedAmount = Math.floor(currentPlayer.cash * fastTrackEvent.expenseBalanceMultiply);
      const amount = Math.min(calculatedAmount, currentPlayer.cash); // Не больше текущего баланса

      // Оплатить
      const payResult = await gameService.payFastTrackExpense(game.gameId, userId, amount);
      if (!payResult.success) {
        await messageService.sendErrorMessage(chatId, 'Ошибка оплаты fastTrack события.');
        return;
      }

    } else if (fastTrackEvent.cost && fastTrackEvent.passiveIncome) {
      // Инвестиция с пассивным доходом
      const buyResult = await gameService.buyFastTrackAsset(game.gameId, userId, fastTrackEvent);
      if (!buyResult.success) {
        if (buyResult.error === 'insufficient_funds') {
          await messageService.sendErrorMessage(chatId, '❌ Недостаточно денег для покупки fastTrack актива.');
          return;
        } else {
          await messageService.sendErrorMessage(chatId, 'Ошибка покупки fastTrack актива.');
          return;
        }
      }

    } else if (fastTrackEvent.cost && !fastTrackEvent.passiveIncome) {
      // Обычные расходы
      const payResult = await gameService.payFastTrackExpense(game.gameId, userId, fastTrackEvent.cost);
      if (!payResult.success) {
        if (payResult.error === 'insufficient_funds') {
          await messageService.sendErrorMessage(chatId, '❌ Недостаточно денег для оплаты fastTrack события.');
          return;
        } else {
          await messageService.sendErrorMessage(chatId, 'Ошибка оплаты fastTrack события.');
          return;
        }
      }

    } else if (fastTrackEvent.cash) {
      // Получение наличных
      const cashResult = await gameService.addFastTrackCash(game.gameId, userId, fastTrackEvent.cash);
      if (!cashResult.success) {
        await messageService.sendErrorMessage(chatId, 'Ошибка получения наличных.');
        return;
      }

    } else if (fastTrackEvent.charity) {
      // Благотворительность - активировать эффект
      await gameService.activateCharity(game.gameId, userId);

    } else if (fastTrackEvent.dice) {
      // Рискованное событие - сохранить для броска кубика
      // Не завершаем здесь, ждем броска кубика
      return;
    }

    // Удалить кнопки с сообщения fastTrack
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Отправить сообщение об успешном выполнении
    let successMessage = `✅ ${currentPlayer.username} выполнил "${fastTrackEvent.title}"`;
    if (fastTrackEvent.cash) {
      successMessage += ` и получил ${formatNumber(fastTrackEvent.cash)} ₽`;
    }
    await messageService.sendErrorMessage(chatId, successMessage);

    // Передать ход следующему игроку
    const nextTurnResult = await gameService.nextTurn(game.gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      if (nextTurnResult.transitioned) {
        await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer);
      }
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
    }

  } catch (error) {
    console.error('Error in handlePayFastTrack:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при выполнении fastTrack события.');
  }
}

/**
 * Обрабатывает бросок кубика для fastTrack события
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleRollDiceFastTrack(query, services) {
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

    // Получить сохраненное fastTrack событие
    const fastTrackEvent = game.currentFastTrack;
    if (!fastTrackEvent || !fastTrackEvent.dice) {
      await messageService.sendErrorMessage(chatId, 'Событие fastTrack с кубиком не найдено.');
      return;
    }

    // Проверить, что пользователь - текущий игрок
    const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!');
      return;
    }

    // Бросить кубик
    const diceResult = Math.floor(Math.random() * 6) + 1;

    // Проверить успех
    let successMessage = `🎲 ${currentPlayer.username} бросил кубик: ${diceResult}\n`;

    if (diceResult >= fastTrackEvent.dice) {
      // Успех - применить награду
      successMessage += `✅ Успех! `;

      if (fastTrackEvent.cash) {
        await gameService.addFastTrackCash(game.gameId, userId, fastTrackEvent.cash);
        successMessage += `Получено ${formatNumber(fastTrackEvent.cash)} ₽`;
      } else if (fastTrackEvent.passiveIncome) {
        await gameService.addFastTrackPassiveIncome(game.gameId, userId, fastTrackEvent.passiveIncome);
        successMessage += `Получен пассивный доход ${formatNumber(fastTrackEvent.passiveIncome)} ₽/мес`;
      }
    } else {
      // Неудача
      successMessage += `❌ Неудача. Ничего не получено.`;
    }

    // Удалить кнопки с сообщения fastTrack
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Отправить результат
    await messageService.sendErrorMessage(chatId, successMessage);

    // Передать ход следующему игроку
    const nextTurnResult = await gameService.nextTurn(game.gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      if (nextTurnResult.transitioned) {
        await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer);
      }
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
    }

  } catch (error) {
    console.error('Error in handleRollDiceFastTrack:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при броске кубика fastTrack.');
  }
}

/**
 * Обрабатывает пропуск fastTrack события
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleSkipFastTrack(query, services) {
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

    // Проверить, что пользователь - текущий игрок
    const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!');
      return;
    }

    // Удалить кнопки с сообщения fastTrack
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Отправить сообщение о пропуске
    await messageService.sendErrorMessage(chatId, `⏭️ ${currentPlayer.username} пропустил fastTrack событие`);

    // Передать ход следующему игроку
    const nextTurnResult = await gameService.nextTurn(game.gameId);
    if (nextTurnResult.success && nextTurnResult.nextPlayer) {
      if (nextTurnResult.transitioned) {
        await messageService.sendFastTrackTransitionMessage(chatId, nextTurnResult.nextPlayer);
      }
      await messageService.sendPlayerTurnMessage(chatId, nextTurnResult.nextPlayer);
    }

  } catch (error) {
    console.error('Error in handleSkipFastTrack:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при пропуске fastTrack события.');
  }
}

module.exports = {
  handleFastTrack,
  handlePayFastTrack,
  handleRollDiceFastTrack,
  handleSkipFastTrack
};
