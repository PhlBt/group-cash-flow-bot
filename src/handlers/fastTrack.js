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
    if (fastTrackEvent.data && fastTrackEvent.data.expenseBalanceMultiply !== undefined) {
      // Оплата процента от баланса - списывается все, если денег недостаточно
      const playerBalance = currentPlayer.fastTrackCash || 0;
      const calculatedAmount = Math.floor(playerBalance * fastTrackEvent.data.expenseBalanceMultiply);
      const amount = Math.min(calculatedAmount, playerBalance); // Не больше текущего баланса

      // Оплатить
      const payResult = await gameService.payFastTrackExpense(game.gameId, userId, amount);
      if (!payResult.success) {
        await messageService.sendErrorMessage(chatId, 'Ошибка оплаты fastTrack события.');
        return;
      }

    } else if (fastTrackEvent.data && fastTrackEvent.data.cost && fastTrackEvent.data.passiveIncome) {
      // Инвестиция с пассивным доходом - теперь обрабатывается через invest_fastTrack
      await messageService.sendErrorMessage(chatId, 'Используйте кнопку "Инвестировать".');
      return;

    } else if (fastTrackEvent.type === 'dream') {
      // Специальная обработка для мечты - не обрабатываем здесь, ждем выбора игрока
      return;
    } else if (fastTrackEvent.data && fastTrackEvent.data.cost && !fastTrackEvent.data.passiveIncome) {
      // Обычные расходы
      const payResult = await gameService.payFastTrackExpense(game.gameId, userId, fastTrackEvent.data.cost);
      if (!payResult.success) {
        if (payResult.error === 'insufficient_funds') {
          await messageService.sendErrorMessage(chatId, '❌ Недостаточно денег для оплаты fastTrack события.');
          return;
        } else {
          await messageService.sendErrorMessage(chatId, 'Ошибка оплаты fastTrack события.');
          return;
        }
      }

    } else if (fastTrackEvent.data && fastTrackEvent.data.cash) {
      // Получение наличных
      const cashResult = await gameService.addFastTrackCash(game.gameId, userId, fastTrackEvent.data.cash);
      if (!cashResult.success) {
        await messageService.sendErrorMessage(chatId, 'Ошибка получения наличных.');
        return;
      }

    } else if (fastTrackEvent.data && fastTrackEvent.data.charity) {
      // Благотворительность - активировать эффект
      await gameService.activateCharity(game.gameId, userId);

    } else if (fastTrackEvent.data && fastTrackEvent.data.dice) {
      // Рискованное событие - сохранить для броска кубика
      // Не завершаем здесь, ждем броска кубика
      return;
    }

    // Удалить кнопки с сообщения fastTrack
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Отправить сообщение об успешном выполнении
    let actionVerb = 'инвестировал в'; // default for investments
    if (fastTrackEvent.data && fastTrackEvent.data.expenseBalanceMultiply !== undefined) {
      actionVerb = 'оплатил расходы по';
    } else if (fastTrackEvent.data && fastTrackEvent.data.charity) {
      actionVerb = 'пожертвовал на';
    } else if (fastTrackEvent.data && fastTrackEvent.data.cash && (!fastTrackEvent.data.dice || fastTrackEvent.data.dice === undefined)) {
      actionVerb = 'получил от';
    }

    let successMessage = `✅ ${currentPlayer.username} ${actionVerb} "${fastTrackEvent.title}"`;
    if (fastTrackEvent.data && fastTrackEvent.data.cash) {
      successMessage += ` и получил ${formatNumber(fastTrackEvent.data.cash)} ₽`;
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
    if (!fastTrackEvent || !fastTrackEvent.data || !fastTrackEvent.data.dice) {
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

    if (diceResult >= fastTrackEvent.data.dice) {
      // Успех - применить награду
      successMessage += `✅ Успех! `;

      if (fastTrackEvent.data.cash) {
        await gameService.addFastTrackCash(game.gameId, userId, fastTrackEvent.data.cash);
        successMessage += `Получено ${formatNumber(fastTrackEvent.data.cash)} ₽`;
      } else if (fastTrackEvent.data.passiveIncome) {
        await gameService.addFastTrackPassiveIncome(game.gameId, userId, fastTrackEvent.data.passiveIncome);
        successMessage += `Получен пассивный доход ${formatNumber(fastTrackEvent.data.passiveIncome)} ₽/мес`;
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
 * Обрабатывает инвестирование в fastTrack поле
 * @param {Object} query - Callback query от Telegram
 * @param {Object} services - Объект с сервисами
 */
async function handleInvestFastTrack(query, services) {
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

    // Проверить, что поле свободно
    const occupationCheck = await gameService.isFastTrackFieldOccupied(game.gameId, userId, fastTrackEvent);
    if (!occupationCheck.success || occupationCheck.occupied) {
      await messageService.sendErrorMessage(chatId, 'Это поле уже занято другим игроком!');
      return;
    }

    // Инвестировать в поле
    const investResult = await gameService.investInFastTrackField(game.gameId, userId, fastTrackEvent);
    if (!investResult.success) {
      if (investResult.error === 'insufficient_funds') {
        await messageService.sendErrorMessage(chatId, '❌ Недостаточно денег для инвестирования.');
        return;
      } else {
        await messageService.sendErrorMessage(chatId, 'Ошибка инвестирования.');
        return;
      }
    }

    // Удалить кнопки с сообщения fastTrack
    await messageService.removeMessageKeyboard(chatId, query.message.message_id);

    // Отправить сообщение об успешном инвестировании
    let successMessage = `✅ ${currentPlayer.username} инвестировал в "${fastTrackEvent.title}"`;

    // Добавить информацию о броске кубика если был
    if (investResult.diceResult !== null) {
      successMessage += `\n🎲 Результат броска: ${investResult.diceResult}`;
      if (investResult.diceResult >= (fastTrackEvent.data ? fastTrackEvent.data.dice : fastTrackEvent.dice)) {
        successMessage += ' (успех!)';
      } else {
        successMessage += ' (неудача - ничего не получено)';
      }
    }

    // Добавить информацию об изменении баланса или дохода
    if (investResult.reward) {
      if (investResult.reward.type === 'cash') {
        successMessage += `\n💰 Получено: ${formatNumber(investResult.reward.amount)} ₽`;
      } else if (investResult.reward.type === 'passiveIncome') {
        successMessage += `\n💵 Пассивный доход: +${formatNumber(investResult.reward.amount)} ₽/мес`;
      }
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
    console.error('Error in handleInvestFastTrack:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при инвестировании в fastTrack поле.');
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
  handleInvestFastTrack,
  handleSkipFastTrack
};
