const { formatNumber, RateLimiter } = require('../utils');
const { welcomeKeyboard, endGameVoteKeyboard, waitingRoomKeyboard, gameKeyboard, charityKeyboard, dealTypeKeyboard, generateDealKeyboard, creditCardKeyboard, profileKeyboard } = require('../utils/keyboards');

class MessageService {
  constructor(bot) {
    this.bot = bot;
    this.rateLimiter = new RateLimiter();
    this.maxRetries = 3;
    this.baseDelay = 10000; // 1 second
    this.backoffMultiplier = 2;
  }

  /**
   * Отправляет сообщение с retryOn429
   * @param {number|string} chatId - ID чата
   * @param {string} text - Текст сообщения
   * @param {Object} options - Опции для sendMessage (reply_markup, parse_mode и т.д.)
   * @returns {Promise<Object>} Результат sendMessage
   */
  async sendMessage(chatId, text, options = {}) {
    return await this.retryOn429(chatId, () => this.bot.sendMessage(chatId, text, options));
  }

  /**
   * Отправляет приветственное сообщение
   * @param {number} chatId - ID чата
   * @param {string} userName - Имя пользователя
   */
  async sendWelcomeMessage(chatId, userName) {
    const message = `🎮 Добро пожаловать в CashFlow!

Правила игры:
🎯 Цель: Выйти из "крысиных бегов", накопив пассивный доход больше расходов

Используйте кнопки ниже для управления игрой.`;
    await this.sendMessage(chatId, message, { reply_markup: welcomeKeyboard });
  }

  /**
   * Отправляет справочное сообщение с командами
   * @param {number} chatId - ID чата
   */
  async sendHelpMessage(chatId) {
    const helpText = `
*Команды бота CashFlow:*

/start - Начать игру
/help - Показать эту справку
/newgame - Создать новую игру
/play - Начать игру
/endgame - Начать голосование за окончание игры

*О игре:*
CashFlow - настольная игра о финансовом планировании.
    `;

    await this.sendMessage(chatId, helpText.trim(), { parse_mode: 'Markdown' });
  }

  /**
   * Отправляет сообщение с правилами игры
   * @param {number} chatId - ID чата
   */
  async sendRulesMessage(chatId) {
    const rulesText = `
*Правила игры CashFlow:*

🎯 *Цель игры:*
Выйти из "крысиных бегов" - состояния, когда ваши расходы превышают доходы. Для этого нужно накопить пассивный доход, превышающий ваши ежемесячные расходы.

💰 *Основные понятия:*
- *Активы* - источники пассивного дохода (аренда, дивиденды и т.д.)
- *Пассивный доход* - доход от активов
- *Расходы* - ежемесячные обязательные платежи
- *Крысиные бега* - когда расходы > доход

🎲 *Как играть:*
1. Создайте новую игру с помощью кнопки "🎮 Играть!" или команды /newgame
2. Следуйте подсказкам бота для управления финансами
3. Принимайте решения о покупке активов и управлении расходами
4. Цель - достичь финансовой свободы!

📋 Используйте кнопки или команды для навигации.
    `;

    await this.sendMessage(chatId, rulesText.trim(), { parse_mode: 'Markdown' });
  }

  /**
   * Отправляет сообщение о создании новой игры
   * @param {number} chatId - ID чата
   * @param {string} gameId - ID созданной игры
   */
  async sendGameCreatedMessage(chatId, gameId) {
    const message = `Новая игра создана! ID игры: ${gameId}. Используйте /play ${gameId} для начала игры.`;
    await this.sendMessage(chatId, message);
  }

  /**
   * Отправляет сообщение об ошибке создания игры
   * @param {number} chatId - ID чата
   */
  async sendGameCreationErrorMessage(chatId) {
    const message = 'Ошибка при создании игры. Попробуйте еще раз.';
    await this.sendMessage(chatId, message);
  }

  /**
   * Отправляет сообщение об ошибке присоединения к игре
   * @param {number} chatId - ID чата
   * @param {string} errorType - Тип ошибки ('not_found', 'already_joined', 'game_started')
   */
  async sendJoinErrorMessage(chatId, errorType) {
    let message;

    switch (errorType) {
      case 'not_found':
        message = 'Игра с таким ID не найдена.';
        break;
      case 'already_joined':
        message = 'Вы уже присоединились к этой игре.';
        break;
      case 'game_started':
        message = 'Игра уже начата или завершена.';
        break;
      case 'max_players_reached':
        message = 'В игре уже максимальное количество игроков (12).';
        break;
      default:
        message = 'Ошибка при присоединении к игре. Попробуйте еще раз.';
    }

    await this.sendMessage(chatId, message);
  }

  /**
   * Выполняет операцию с rate limiting и повторными попытками при ошибке 429
   * @param {number|string} chatId - ID чата для rate limiting
   * @param {Function} operation - Асинхронная функция для выполнения
   * @param {boolean} useLimiter - Использовать ли rate limiter (по умолчанию true)
   * @param {number} attempt - Текущая попытка (внутренний параметр)
   * @returns {Promise} Результат операции
   */
  async retryOn429(chatId, operation, useLimiter = true, attempt = 1) {
    try {
      // Применяем rate limiting, если указано
      if (useLimiter) {
        return await this.rateLimiter.schedule(chatId, async () => {
          return await operation();
        });
      } else {
        return await operation();
      }
    } catch (error) {
      if (error.code === 'ETELEGRAM' && error.response && error.response.statusCode === 429) {
        // Блокируем чат при первой же 429 ошибке
        if (attempt === 1) {
          // Используем retry_after или baseDelay * backoffMultiplier
          let blockDuration;
          if (error.response.parameters && error.response.parameters.retry_after) {
            blockDuration = error.response.parameters.retry_after * 1000; // retry_after в секундах
          } else {
            blockDuration = this.baseDelay * this.backoffMultiplier; // 10 * 2 = 20 секунд
          }
          this.rateLimiter.blockChat(chatId, blockDuration);
        }

        if (attempt < this.maxRetries) {
          // Используем retry_after из ответа Telegram, если доступно
          let delay;
          if (error.response.parameters && error.response.parameters.retry_after) {
            delay = error.response.parameters.retry_after * 1000; // секунды в миллисекунды
            console.log(`Rate limit hit, retrying in ${delay}ms (as specified by Telegram, attempt ${attempt}/${this.maxRetries})`);
          } else {
            // Fallback на экспоненциальную задержку
            delay = this.baseDelay * Math.pow(this.backoffMultiplier, attempt - 1);
            console.log(`Rate limit hit, retrying in ${delay}ms (fallback exponential backoff, attempt ${attempt}/${this.maxRetries})`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.retryOn429(chatId, operation, useLimiter, attempt + 1);
        } else {
          console.error('Max retries exceeded for Telegram API rate limit');
          throw error;
        }
      } else {
        // Для других ошибок не повторяем
        throw error;
      }
    }
  }

  /**
   * Отправляет статистику игры
   * @param {number} chatId - ID чата
   * @param {Object} game - Объект игры
   */
  async sendGameStatsMessage(chatId, game) {
    const trackName = game.status === 'active' ? 'активна' : 'завершена';
    const currentPlayer = game.players.find(p => p.userId === game.currentPlayerId);
    const currentPlayerName = currentPlayer ? `${currentPlayer.profession} ${currentPlayer.username}` : 'Не определен';

    let message = `📊 СТАТУС ИГРЫ\n\n`;
    message += `Игра: ${trackName}\n`;
    message += `Текущий ход: ${currentPlayerName}\n\n`;
    message += `Игроки:\n\n`;

    game.players.forEach((player, index) => {
      message += `${index + 1}. ${player.profession} ${player.username}\n`;
      message += `   💰 Деньги: ${formatNumber(player.cash)} ₽\n`;
      message += `   📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/мес\n`;
      message += `   📉 Расходы: ${formatNumber(player.totalExpenses)} ₽/мес\n`;
      message += `   📊 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес\n`;
      message += `   🏠 Активы: ${player.assetsCount}\n`;
      message += `   💳 Кредиты: ${player.loansCount || 0}\n\n`;
    });

    await this.sendMessage(chatId, message);
  }

  /**
   * Отправляет сообщение об успешном начале игры
   * @param {number} chatId - ID чата
   * @param {string} gameId - ID игры
   */
  async sendPlaySuccessMessage(chatId, gameId) {
    const message = `Игра ${gameId} начата!`;
    await this.sendMessage(chatId, message);
  }

  /**
   * Отправляет сообщение об ошибке начала игры
   * @param {number} chatId - ID чата
   * @param {string} errorType - Тип ошибки ('not_found', 'not_creator', 'already_started')
   */
  async sendPlayErrorMessage(chatId, errorType) {
    let message;

    switch (errorType) {
      case 'not_found':
        message = 'Игра с таким ID не найдена.';
        break;
      case 'not_creator':
        message = 'Только создатель игры может начать ее.';
        break;
      case 'already_started':
        message = 'Игра уже начата.';
        break;
      default:
        message = 'Ошибка при начале игры. Попробуйте еще раз.';
    }

    await this.sendMessage(chatId, message);
  }

  /**
   * Отправляет профиль игрока с кнопками активов и кредитов
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   * @param {Object} userStats - Статистика пользователя
   */
  async sendPlayerProfileMessage(chatId, player, userStats) {
    let info = `👤 ${player.username}\n`;

    // Добавляем статистику пользователя
    if (userStats) {
      const UserStatsService = require('./userStatsService');
      info += `${UserStatsService.formatUserStats(userStats)}\n\n`;
    }

    if (!player.inFastTrack) {
      info += `💼 Профессия: ${player.profession}\n\n`;

      info += `💰 Баланс: ${formatNumber(player.cash)} ₽\n\n`;

      info += `💵 Зарплата: ${formatNumber(player.salary)} ₽/месяц\n`;
      info += `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/месяц\n`;
      info += `📊 Общий доход: ${formatNumber(player.totalIncome)} ₽/месяц\n\n`;

      info += `💸 Базовые расходы: ${formatNumber(player.expenses)} ₽/месяц\n`;
      if (player.loansCount && player.loansCount > 0) {
        info += `💸 Платежи по кредитам: ${formatNumber(player.totalLoanPayments)} ₽/месяц\n`;
      }
      if (player.childrenCount && player.childrenCount > 0) {
        info += `👶 Детей: ${player.childrenCount} (расходы: ${formatNumber(player.childrenExpenses)} ₽/месяц)\n`;
      }
      info += `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/месяц\n\n`;

      info += `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/месяц\n\n`;

      info += `🏠 Активов: ${player.assetsCount}\n`;
      // Информация о кредитах
      if (player.loansCount && player.loansCount > 0) {
        info += `💳 Кредитов: ${player.loansCount}\n`;
        info += `📊 Общая сумма кредитов: ${formatNumber(player.totalLoans)} ₽\n`;
      }
    }

    const trackName = player.inFastTrack ? '🚀 Скоростная дорожка' : '🐀 Крысинные бега';
    info += `\n📍 ${trackName}, поле ${player.position + 1}`;

    if (player.cashFlow > 0) {
      info += `\n\n✅ Положительный денежный поток!`;
    } else {
      info += `\n\n⚠️ Отрицательный денежный поток`;
    }

    if (player.passiveIncome >= player.totalExpenses) {
      info += `\n\n🎉 ВЫ ВЫШЛИ ИЗ КРЫСИНЫХ БЕГОВ!`;
    }

    if (player.inFastTrack) {
      info += `\n\n🚀 СКОРОСТНАЯ ДОРОЖКА:`;
      info += `\n💰 Капитал: ${formatNumber(player.fastTrackCash || 0)} ₽`;
      info += `\n💵 Доход: ${formatNumber(player.fastTrackIncome || 0)} ₽/мес`;
      info += `\n🎯 Цель (мечта): ${formatNumber(player.dreamCost || 0)} ₽`;
    }

    await this.sendMessage(chatId, info, { reply_markup: profileKeyboard });
  }

  /**
   * Отправляет карточку игрока или только статистику
   * @param {number} chatId - ID чата
   * @param {Object|null} player - Объект игрока (null для показа только статистики)
   * @param {Object} userStats - Статистика пользователя
   */
  async sendPlayerCard(chatId, player, userStats) {
    let info = '';

    // Добавляем статистику пользователя всегда
    if (userStats) {
      const UserStatsService = require('./userStatsService');
      info += `${UserStatsService.formatUserStats(userStats)}\n\n`;
    }

    // Если передан игрок, добавляем информацию об игре
    if (player) {
      info += `👤 ${player.username}\n`;

      if (!player.inFastTrack) {
        info += `💼 Профессия: ${player.profession}\n\n`;

        info += `💰 Баланс: ${formatNumber(player.cash)} ₽\n\n`;

        info += `💵 Зарплата: ${formatNumber(player.salary)} ₽/месяц\n`;
        info += `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/месяц\n`;
        info += `📊 Общий доход: ${formatNumber(player.totalIncome)} ₽/месяц\n\n`;

        info += `💸 Базовые расходы: ${formatNumber(player.expenses)} ₽/месяц\n`;
        if (player.loansCount && player.loansCount > 0) {
          info += `💸 Платежи по кредитам: ${formatNumber(player.totalLoanPayments)} ₽/месяц\n`;
        }
        if (player.childrenCount && player.childrenCount > 0) {
          info += `👶 Детей: ${player.childrenCount} (расходы: ${formatNumber(player.childrenExpenses)} ₽/месяц)\n`;
        }
        info += `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/месяц\n\n`;

        info += `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/месяц\n\n`;

        info += `🏠 Активов: ${player.assetsCount}\n`;
        // Информация о кредитах
        if (player.loansCount && player.loansCount > 0) {
          info += `💳 Кредитов: ${player.loansCount}\n`;
          info += `📊 Общая сумма кредитов: ${formatNumber(player.totalLoans)} ₽\n`;
        }
      }

      const trackName = player.inFastTrack ? '🚀 Скоростная дорожка' : '🐀 Крысинные бега';
      info += `\n📍 ${trackName}, поле ${player.position + 1}`;

      if (player.cashFlow > 0) {
        info += `\n\n✅ Положительный денежный поток!`;
      } else {
        info += `\n\n⚠️ Отрицательный денежный поток`;
      }

      if (player.passiveIncome >= player.totalExpenses) {
        info += `\n\n🎉 ВЫ ВЫШЛИ ИЗ КРЫСИНЫХ БЕГОВ!`;
      }

      if (player.inFastTrack) {
        info += `\n\n🚀 СКОРОСТНАЯ ДОРОЖКА:`;
        info += `\n💰 Капитал: ${formatNumber(player.fastTrackCash || 0)} ₽`;
        info += `\n💵 Доход: ${formatNumber(player.fastTrackIncome || 0)} ₽/мес`;
        info += `\n🎯 Цель (мечта): ${formatNumber(player.dreamCost || 0)} ₽`;
      }
    }

    await this.sendMessage(chatId, info);
  }

  /**
   * Отправляет сообщение о голосовании за окончание игры
   * @param {number} chatId - ID чата
   * @param {Object} game - Объект игры
   * @param {Array} votedUsers - Массив ID проголосовавших пользователей
   * @returns {Promise<number>} ID отправленного сообщения
   */
  async sendEndGameVoteMessage(chatId, game, votedUsers) {
    const totalPlayers = game.players.length;
    const majority = Math.ceil(totalPlayers / 2);
    const votedCount = votedUsers.length;

    let votersList = '';
    if (votedUsers.length > 0) {
      const voterNames = votedUsers.map(userId => {
        const player = game.players.find(p => p.userId === userId);
        return player ? player.username : 'Неизвестный';
      });
      votersList = `\n\nЗа завершение проголосовали:\n${voterNames.join('\n')}`;
    }

    const message = `🛑 ${votedUsers.length === 1 ? 'Игрок' : 'Игроки'} хочет завершить игру!\n\nГолосов: ${votedCount}/${majority} (нужно большинство)${votersList}`;

    const sentMessage = await this.sendMessage(chatId, message, {
      reply_markup: endGameVoteKeyboard
    });

    return sentMessage.message_id;
  }

  /**
   * Обновляет сообщение о голосовании за окончание игры
   * @param {number} chatId - ID чата
   * @param {number} messageId - ID сообщения
   * @param {Object} game - Объект игры
   * @param {Array} votedUsers - Массив ID проголосовавших пользователей
   */
  async updateEndGameVoteMessage(chatId, messageId, game, votedUsers) {
    const totalPlayers = game.players.length;
    const majority = Math.ceil(totalPlayers / 2);
    const votedCount = votedUsers.length;

    let votersList = '';
    if (votedUsers.length > 0) {
      const voterNames = votedUsers.map(userId => {
        const player = game.players.find(p => p.userId === userId);
        return player ? player.username : 'Неизвестный';
      });
      votersList = `\n\nЗа завершение проголосовали:\n${voterNames.join('\n')}`;
    }

    const message = `🛑 ${votedUsers.length === 1 ? 'Игрок' : 'Игроки'} хочет завершить игру!\n\nГолосов: ${votedCount}/${majority} (нужно большинство)${votersList}`;

    await this.editMessageText(chatId, messageId, message, {
      reply_markup: endGameVoteKeyboard
    });
  }

  /**
   * Отправляет сообщение о завершении игры
   * @param {number} chatId - ID чата
   */
  async sendGameFinishedMessage(chatId) {
    const message = `🎉 Игра завершена по голосованию игроков!`;
    await this.sendMessage(chatId, message);
  }

  /**
   * Отправляет сообщение об ошибке окончания игры
   * @param {number} chatId - ID чата
   * @param {string} errorType - Тип ошибки
   */
  async sendEndGameErrorMessage(chatId, errorType) {
    let message;

    switch (errorType) {
      case 'not_found':
        message = 'Игра не найдена.';
        break;
      case 'not_active':
        message = 'Игра не активна.';
        break;
      case 'already_finished':
        message = 'Игра уже завершена.';
        break;
      case 'not_player':
        message = 'Вы не участник этой игры.';
        break;
      case 'already_voted':
        message = 'Вы уже проголосовали.';
        break;
      default:
        message = 'Ошибка при голосовании. Попробуйте еще раз.';
    }

    await this.sendMessage(chatId, message);
  }

  /**
   * Отправляет сообщение комнаты ожидания
   * @param {number} chatId - ID чата
   * @param {Object} game - Объект игры
   * @returns {Promise<number>} ID отправленного сообщения
   */
  async sendWaitingRoomMessage(chatId, game) {
    const playersList = game.players.map(player => `- ${player.username}`).join('\n');
    const waitingText = game.players.length === 1 ? 'Этот игрок ждёт вас' : 'Эти игроки ждут вас';

    const message = `🎮 Комната ожидания\n\nИгроки:\n${playersList}\n\n${waitingText}`;

    const sentMessage = await this.sendMessage(chatId, message, {
      reply_markup: waitingRoomKeyboard
    });

    return sentMessage.message_id;
  }

  /**
   * Обновляет сообщение комнаты ожидания
   * @param {number} chatId - ID чата
   * @param {number} messageId - ID сообщения для обновления
   * @param {Object} game - Объект игры
   */
  async updateWaitingRoomMessage(chatId, messageId, game) {
    const playersList = game.players.map(player => `- ${player.username}`).join('\n');
    const waitingText = game.players.length === 1 ? 'Этот игрок ждёт вас' : 'Эти игроки ждут вас';

    const message = `🎮 Комната ожидания\n\nИгроки:\n${playersList}\n\n${waitingText}`;

    await this.editMessageText(chatId, messageId, message, {
      reply_markup: waitingRoomKeyboard
    });
  }

  /**
   * Удаляет сообщение
   * @param {number} chatId - ID чата
   * @param {number} messageId - ID сообщения
   */
  async deleteMessage(chatId, messageId) {
    try {
      await this.retryOn429(chatId, () => this.bot.deleteMessage(chatId, messageId), false);
    } catch (error) {
      console.error('Error deleting message:', error);
      // Игнорируем ошибки, если сообщение уже удалено или не существует
    }
  }

  /**
   * Удаляет клавиатуру с сообщения, оставляя текст
   * @param {number} chatId - ID чата
   * @param {number} messageId - ID сообщения
   */
  async removeMessageKeyboard(chatId, messageId) {
    try {
      await this.retryOn429(chatId, () => this.bot.editMessageReplyMarkup({}, {
        chat_id: chatId,
        message_id: messageId
      }), false);
    } catch (error) {
      console.error('Error removing keyboard:', error);
      // Игнорируем ошибки, если сообщение уже изменено или не существует
    }
  }

  /**
   * Редактирует текст сообщения
   * @param {number} chatId - ID чата
   * @param {number} messageId - ID сообщения
   * @param {string} newText - Новый текст сообщения
   * @param {Object} options - Дополнительные опции для editMessageText (reply_markup, parse_mode и т.д.)
   */
  async editMessageText(chatId, messageId, newText, options = {}) {
    await this.retryOn429(chatId, () => this.bot.editMessageText(newText, {
      chat_id: chatId,
      message_id: messageId,
      ...options
    }), false);
  }

  /**
   * Отправляет общее сообщение об ошибке
   * @param {number} chatId - ID чата
   * @param {string} errorText - Текст ошибки
   */
  async sendErrorMessage(chatId, errorText) {
    await this.sendMessage(chatId, errorText);
  }

  /**
   * Отправляет сообщение с ходом игрока
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   * @returns {Promise<number>} ID отправленного сообщения
   */
  async sendPlayerTurnMessage(chatId, player) {
    const trackName = player.inFastTrack ? '🚀 Скоростная дорожка' : '🐀 Крысинные бега';

    let message = `🎯 Ваш ход, ${player.profession} ${player.username}!\n\n`;
    message += `💰 Баланс: ${formatNumber(player.cash)} ₽\n`;
    message += `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/мес\n`;
    message += `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/мес\n`;
    message += `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес\n`;
    message += `📍 ${trackName}, поле ${player.position + 1}\n\n`;
    message += `Выберите действие:`;

    const keyboard = (player.charityEffect && player.charityTurnsLeft > 0) ? charityKeyboard : gameKeyboard;

    const sentMessage = await this.sendMessage(chatId, message, {
      reply_markup: keyboard
    });

    return sentMessage.message_id;
  }

  /**
   * Рассчитывает суммарные выплаты и обновленный баланс
   * @param {Array} paydayEvents - массив событий выплат
   * @param {number} playerCash - текущий баланс игрока
   * @returns {Object} { totalPayday, updatedCash }
   */
  calculatePaydaySummary(paydayEvents, playerCash) {
    let totalPayday = 0;
    let updatedCash = playerCash;

    if (paydayEvents && paydayEvents.length > 0) {
      for (const event of paydayEvents) {
        totalPayday += event.cashFlow;
      }
      updatedCash += totalPayday;
    }

    return { totalPayday, updatedCash };
  }

  /**
   * Форматирует финансовую статистику игрока
   * @param {Object} player - объект игрока
   * @param {number} cash - опциональный баланс (если отличается от player.cash)
   * @returns {string} отформатированная строка
   */
  formatPlayerStats(player, cash = null) {
    const currentCash = cash !== null ? cash : player.cash;

    return `💰 Баланс: ${formatNumber(currentCash)} ₽\n` +
      `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/мес\n` +
      `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/мес\n` +
      `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес\n`;
  }

  /**
   * Возвращает эмодзи для грани кубика
   * @param {number} value - Значение грани (1-6)
   * @returns {string} Эмодзи
   */
  getDiceEmoji(value) {
    const emojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    return emojis[value - 1] || '🎲';
  }

  /**
   * Отправляет комбинированное сообщение с броском, перемещением, выплатами и ходом игрока
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   * @param {number} steps - Количество шагов
   * @param {number} newPosition - Новая позиция
   * @param {string} fieldType - Тип поля
   * @param {boolean} inFastTrack - На Fast Track
   * @param {Array} paydayEvents - Массив событий выплат
   */
  async sendCombinedRollMovePaydayMessage(chatId, player, steps, newPosition, fieldType, inFastTrack, paydayEvents = []) {
    const trackName = inFastTrack ? '🚀 Скоростная дорожка' : '🐀 Крысинные бега';
    const fieldName = this.getFieldName(fieldType);

    let message = `🎲 ${player.profession} ${player.username} выкинул ${steps} шагов\n`;
    message += `📍 ${trackName}, поле ${newPosition + 1}\n\n`;

    // Суммируем выплаты
    let totalPayday = 0;
    let updatedCash = player.cash;
    if (paydayEvents && paydayEvents.length > 0) {
      for (const event of paydayEvents) {
        totalPayday += event.cashFlow;
      }
      updatedCash += totalPayday;

      const action = totalPayday >= 0 ? 'Получено' : 'Уплачено';
      const absPayday = Math.abs(totalPayday);

      message += `💰 День выплат!\n${action}: ${formatNumber(absPayday)} ₽\n\n`;
    }

    message += `📍 ${fieldName}\n\n`;
    message += `💰 Баланс: ${formatNumber(updatedCash)} ₽\n`;
    message += `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/мес\n`;
    message += `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/мес\n`;
    message += `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес\n\n`;
    message += `Выберите действие:`;

    const keyboard = (player.charityEffect && player.charityTurnsLeft > 0) ? charityKeyboard : gameKeyboard;

    await this.sendMessage(chatId, message, {
      reply_markup: keyboard
    });
  }

  /**
   * Возвращает название типа поля
   * @param {string} fieldType - Тип поля
   * @returns {string} Название поля
   */
  getFieldName(fieldType) {
    const { FIELD_TYPES } = require('../game/board');

    switch (fieldType) {
      case FIELD_TYPES.DEAL: return 'Сделка';
      case FIELD_TYPES.MARKET: return 'Рынок';
      case FIELD_TYPES.PAYDAY: return 'День выплат';
      case FIELD_TYPES.CHARITY: return 'Благотворительность';
      case FIELD_TYPES.MISCELLANEOUS: return 'Всякая всячина';
      case FIELD_TYPES.CHILD: return 'Ребенок';
      case FIELD_TYPES.DISMISSAL: return 'Увольнение';
      case FIELD_TYPES.OPPORTUNITY: return 'Возможность';
      case FIELD_TYPES.LAWSUIT: return 'Судебный иск';
      case FIELD_TYPES.TAX_AUDIT: return 'Налоговая проверка';
      case FIELD_TYPES.BAD_PARTNER: return 'Плохой партнер';
      case FIELD_TYPES.DIVORCE: return 'Развод';
      case FIELD_TYPES.UNEXPECTED_REPAIR: return 'Неожиданный ремонт';
      case FIELD_TYPES.HEALTH_CARE: return 'Забота о здоровье';
      default: return 'Неизвестное поле';
    }
  }

  /**
   * Отправляет комбинированное сообщение с броском, перемещением, выплатами и полем "Сделки"
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   * @param {number} steps - Количество шагов
   * @param {number} newPosition - Новая позиция
   * @param {boolean} inFastTrack - На Fast Track
   * @param {Array} paydayEvents - Массив событий выплат
   */
  async sendCombinedRollMoveDealMessage(chatId, player, steps, newPosition, inFastTrack, paydayEvents = []) {
    const trackName = inFastTrack ? '🚀 Скоростная дорожка' : '🐀 Крысинные бега';

    let message = `🎲 ${player.profession} ${player.username} выкинул ${steps} шагов\n`;
    message += `📍 ${trackName}, поле ${newPosition + 1}\n\n`;

    // Суммируем выплаты
    let totalPayday = 0;
    let updatedCash = player.cash;
    if (paydayEvents && paydayEvents.length > 0) {
      for (const event of paydayEvents) {
        totalPayday += event.cashFlow;
      }
      updatedCash += totalPayday;

      const action = totalPayday >= 0 ? 'Получено' : 'Уплачено';
      const absPayday = Math.abs(totalPayday);

      message += `💰 День выплат!\n${action}: ${formatNumber(absPayday)} ₽\n\n`;
    }

    message += `💼 Вы попали на поле "Сделки"\n\n`;
    message += `💰 Баланс: ${formatNumber(updatedCash)} ₽\n`;
    message += `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/мес\n`;
    message += `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/мес\n`;
    message += `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес\n\n`;
    message += `Выберите тип сделки:`;

    await this.sendMessage(chatId, message, {
      reply_markup: dealTypeKeyboard
    });
  }

  /**
   * Отправляет сообщение выбора типа сделки
   * @param {number} chatId - ID чата
   * @returns {Promise<number>} ID отправленного сообщения
   */
  async sendDealTypeMessage(chatId) {
    const message = `💼 Вы попали на поле "Сделки"!\n\nВыберите тип сделки:`;

    const sentMessage = await this.sendMessage(chatId, message, {
      reply_markup: dealTypeKeyboard
    });

    return sentMessage.message_id;
  }

  /**
   * Отправляет карточку сделки
   * @param {number} chatId - ID чата
   * @param {Object} deal - Объект сделки
   * @param {Object} player - Объект игрока
   * @param {Object} game - Объект игры
   * @param {number} quantity - Текущее количество для unlimitedStocks
   * @param {string} customTitle - Кастомный заголовок (опционально)
   * @returns {Promise<number>} ID отправленного сообщения
   */
  async sendDealCardMessage(chatId, deal, player, game, quantity = 1, customTitle = null) {
    const content = this.generateDealCardContent(deal, player, game, quantity, customTitle);

    const sentMessage = await this.sendMessage(chatId, content.text, {
      parse_mode: 'Markdown',
      reply_markup: content.keyboard
    });

    return sentMessage.message_id;
  }

  /**
   * Генерирует текст и клавиатуру для карточки сделки (без отправки)
   * @param {Object} deal - Объект сделки
   * @param {Object} player - Объект игрока
   * @param {Object} game - Объект игры
   * @param {number} quantity - Текущее количество для unlimitedStocks
   * @param {string} customTitle - Кастомный заголовок (опционально)
   * @returns {Object} Объект с text и keyboard
   */
  generateDealCardContent(deal, player, game, quantity = 1, customTitle = null) {
    let message = customTitle ? `${customTitle}\n\n💼 **${deal.title}**\n\n` : `💼 **${deal.title}**\n\n`;
    message += `📝 ${deal.description}\n\n`;

    if (deal.cost) {
      message += `💰 Стоимость: ${formatNumber(deal.cost)} ₽\n`;
      // Проверяем, находится ли игра в циркуляции canSellStocks и является ли игрок оригинальным
      const isInCanSellStocksCirculation = game.dealCirculationPlayers && game.dealCirculationPlayers.length > 0 && deal.canSellStocks;
      const isOriginalPlayerInCirculation = isInCanSellStocksCirculation && game.currentPlayerIndex === game.dealCirculationOriginalIndex;

      if (deal.unlimitedStocks && (!isInCanSellStocksCirculation || isOriginalPlayerInCirculation)) {
        message += `🔢 Количество: ${quantity}\n`;
        message += `💰 Общая стоимость: ${formatNumber(deal.cost * quantity)} ₽\n`;
      }
    }

    // Показать денежный поток (cashFlow или passiveIncome)
    const income = deal.passiveIncome || deal.cashFlow;
    if (income !== undefined) {
      message += `💵 Денежный поток: ${formatNumber(income)} ₽/месяц`;
      if (deal.unlimitedStocks) {
        message += ` (за единицу)`;
      }
      message += `\n`;
    }

    if (deal.roi) {
      message += `📈 Доходность: ${deal.roi}\n`;
    }

    if (deal.sellRange) {
      message += `📊 Диапазон продажи: ${deal.sellRange}\n`;
    }

    if (deal.range) {
      message += `📊 Диапазон цен: ${deal.range}\n`;
    }

    if (deal.downPayment) {
      message += `🏦 Первоначальный взнос: ${formatNumber(deal.downPayment)} ₽\n`;
    }

    if (deal.mortgage) {
      message += `🏠 Ипотека: ${formatNumber(deal.mortgage)} ₽\n`;
    }

    if (deal.apartments) {
      message += `🏢 Квартир: ${deal.apartments}\n`;
    }

    if (deal.expenses) {
      message += `📉 Расходы: ${formatNumber(deal.expenses)} ₽\n`;
    }

    message += `\n💰 Баланс: ${formatNumber(player.cash)} ₽\n`;

    // Если можно продавать акции и у игрока есть активы с тем же group_Id
    if (deal.canSellStocks && deal.group_Id && player.assets) {
      const sameGroupAssets = player.assets.filter(asset => asset.group_Id === deal.group_Id);
      if (sameGroupAssets.length > 0) {
        const totalQuantity = sameGroupAssets.reduce((sum, asset) => sum + (asset.quantity || 1), 0);
        const sellPrice = deal.cost * totalQuantity;
        const totalBuyCost = sameGroupAssets.reduce((sum, asset) => sum + (asset.cost * (asset.quantity || 1)), 0);
        const profit = deal.cost * totalQuantity - totalBuyCost;

        const profitText = profit >= 0 ? `+${formatNumber(profit)} ₽` : `${formatNumber(profit)} ₽`;

        message += `\n💸 Продажа: ${totalQuantity} акций за ${formatNumber(sellPrice)} ₽ (${profitText})\n`;
      }
    }

    // Динамический текст в зависимости от состояния предложения
    const offerState = game.offerState;
    if (offerState && offerState.offeringUserId === player.userId) {
      if (offerState.step === 'commission') {
        message += `\nКакую комиссию вы берете за предложение сделки?`;
      } else if (offerState.step === 'select_user') {
        message += `\nКому вы хотите предложить сделку с комиссией ${offerState.commission}%?`;
      }
    } else {
      message += `\nЧто вы хотите сделать?`;
    }

    // Генерируем клавиатуру в зависимости от типа сделки
    const keyboard = generateDealKeyboard(deal, player, game, quantity);

    return { text: message, keyboard };
  }

  /**
   * Отправляет предложение оплаты кредиткой
   * @param {number} chatId - ID чата
   * @param {Object} deal - Объект сделки
   * @param {Object} player - Объект игрока
   * @returns {Promise<number>} ID отправленного сообщения
   */
  async sendCreditCardOfferMessage(chatId, deal, player) {
    let message = `💼 **${deal.title}**\n\n`;
    message += `📝 ${deal.description}\n\n`;
    message += `💰 Стоимость: ${formatNumber(deal.cost)} ₽\n`;

    // Показать денежный поток (cashFlow или passiveIncome)
    const income = deal.passiveIncome || deal.cashFlow;
    if (income !== undefined) {
      message += `💵 Денежный поток: ${formatNumber(income)} ₽/месяц\n`;
    }

    message += `💰 Ваши деньги: ${formatNumber(player.cash)} ₽\n\n`;

    // Стоимость кредитной карты (2% от стоимости)
    const monthlyPayment = Math.floor(deal.cost * 0.02);
    message += `❌ Недостаточно денег для покупки!\n\n`;
    message += `💳 Оплатить кредиткой:\n`;
    message += `📊 Ежемесячный платеж: ${formatNumber(monthlyPayment)} ₽\n\n`;
    message += `Что вы хотите сделать?`;

    const sentMessage = await this.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: creditCardKeyboard
    });

    return sentMessage.message_id;
  }

  /**
   * Отправляет сообщение с активами игрока
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   */
  async sendPlayerAssetsMessage(chatId, player) {
    let message = `🏠 АКТИВЫ ${player.username}\n\n`;

    if (player.assets && player.assets.length > 0) {
      player.assets.forEach((asset, index) => {
        message += `${index + 1}. ${asset.title}\n`;
        message += `   💰 Стоимость: ${formatNumber(asset.cost)} ₽\n`;
        if (asset.quantity && asset.quantity > 1) {
          message += `   🔢 Количество: ${asset.quantity}\n`;
        }
        if (asset.cashFlow) {
          message += `   💵 Доход: ${formatNumber(asset.cashFlow)} ₽/мес\n`;
        }
        message += `\n`;
      });
      message += `📊 Всего активов: ${player.assetsCount}`;
    } else {
      message += `У вас пока нет активов.`;
    }

    await this.sendMessage(chatId, message);
  }

  /**
   * Отправляет сообщение с кредитами игрока
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   */
  async sendPlayerCreditsMessage(chatId, player) {
    let message = `💳 КРЕДИТЫ ${player.username}\n\n`;

    if (player.loansCount && player.loansCount > 0) {
      message += `📊 Количество кредитов: ${player.loansCount}\n`;
      message += `💰 Общая сумма: ${formatNumber(player.totalLoans)} ₽\n`;
      message += `📉 Ежемесячные платежи: ${formatNumber(player.totalLoanPayments)} ₽/мес\n\n`;

      if (player.liabilities && player.liabilities.length > 0) {
        message += `Подробности:\n`;
        player.liabilities.forEach((liability, index) => {
          message += `${index + 1}. ${liability.title}\n`;
          message += `   💰 Сумма: ${formatNumber(liability.loanAmount)} ₽\n`;
          message += `   📊 Платеж: ${formatNumber(liability.monthlyPayment)} ₽/месяц\n`;
          message += `\n`;
        });
      }
    } else {
      message += `У вас нет кредитов.`;
    }

    await this.sendMessage(chatId, message);
  }
}

module.exports = MessageService;
