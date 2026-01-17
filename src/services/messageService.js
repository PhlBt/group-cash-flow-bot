const { formatNumber } = require('../utils');
const { welcomeKeyboard, endGameVoteKeyboard, waitingRoomKeyboard, gameKeyboard, charityKeyboard } = require('../utils/keyboards');

class MessageService {
  constructor(bot) {
    this.bot = bot;
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
    await this.bot.sendMessage(chatId, message, { reply_markup: welcomeKeyboard });
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

    await this.bot.sendMessage(chatId, helpText.trim(), { parse_mode: 'Markdown' });
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

    await this.bot.sendMessage(chatId, rulesText.trim(), { parse_mode: 'Markdown' });
  }

  /**
   * Отправляет сообщение о создании новой игры
   * @param {number} chatId - ID чата
   * @param {string} gameId - ID созданной игры
   */
  async sendGameCreatedMessage(chatId, gameId) {
    const message = `Новая игра создана! ID игры: ${gameId}. Используйте /play ${gameId} для начала игры.`;
    await this.bot.sendMessage(chatId, message);
  }

  /**
   * Отправляет сообщение об ошибке создания игры
   * @param {number} chatId - ID чата
   */
  async sendGameCreationErrorMessage(chatId) {
    const message = 'Ошибка при создании игры. Попробуйте еще раз.';
    await this.bot.sendMessage(chatId, message);
  }

  /**
   * Отправляет сообщение об успешном присоединении к игре
   * @param {number} chatId - ID чата
   * @param {string} gameId - ID игры
   */
  async sendJoinSuccessMessage(chatId, gameId) {
    const message = `Вы присоединились к игре ${gameId}!`;
    await this.bot.sendMessage(chatId, message);
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
      default:
        message = 'Ошибка при присоединении к игре. Попробуйте еще раз.';
    }

    await this.bot.sendMessage(chatId, message);
  }

  /**
   * Отправляет сообщение об успешном начале игры
   * @param {number} chatId - ID чата
   * @param {string} gameId - ID игры
   */
  async sendPlaySuccessMessage(chatId, gameId) {
    const message = `Игра ${gameId} начата!`;
    await this.bot.sendMessage(chatId, message);
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

    await this.bot.sendMessage(chatId, message);
  }

  /**
   * Отправляет карточку игрока
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   */
  async sendPlayerCard(chatId, player) {
    let info = `👤 ${player.username}\n`;
    info += `💼 Профессия: ${player.profession}\n`;
    info += `💰 Деньги: ${formatNumber(player.cash)} ₽\n`;
    info += `💵 Зарплата: ${formatNumber(player.salary)} ₽/месяц\n`;
    info += `💸 Базовые расходы: ${formatNumber(player.expenses)} ₽/месяц\n`;

    if (player.childrenCount && player.childrenCount > 0) {
      info += `👶 Детей: ${player.childrenCount} (расходы: ${formatNumber(player.childrenExpenses)} ₽/месяц)\n`;
    }

    info += `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/месяц\n`;
    info += `📊 Общий доход: ${formatNumber(player.totalIncome)} ₽/месяц\n`;
    info += `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/месяц\n`;
    info += `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/месяц\n`;
    info += `🏠 Активов: ${player.assetsCount}\n`;
    info += `📋 Пассивов: ${player.liabilitiesCount}\n`;

    // Информация о кредитах
    if (player.loansCount && player.loansCount > 0) {
      info += `💳 Кредитов: ${player.loansCount}\n`;
      info += `📊 Общая сумма кредитов: ${formatNumber(player.totalLoans)} ₽\n`;
      info += `💸 Платежи по кредитам: ${formatNumber(player.totalLoanPayments)} ₽/месяц\n`;
    }

    info += `📍 Позиция: ${player.position + 1}\n`;

    if (player.cashFlow > 0) {
      info += `\n✅ Положительный денежный поток!`;
    } else {
      info += `\n⚠️ Отрицательный денежный поток`;
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

    await this.bot.sendMessage(chatId, info);
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

    const sentMessage = await this.bot.sendMessage(chatId, message, {
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

    await this.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: endGameVoteKeyboard
    });
  }

  /**
   * Отправляет сообщение о завершении игры
   * @param {number} chatId - ID чата
   * @param {string} gameId - ID игры
   */
  async sendGameFinishedMessage(chatId, gameId) {
    const message = `🎉 Игра ${gameId} завершена по голосованию игроков!`;
    await this.bot.sendMessage(chatId, message);
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

    await this.bot.sendMessage(chatId, message);
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

    const sentMessage = await this.bot.sendMessage(chatId, message, {
      reply_markup: waitingRoomKeyboard
    });

    return sentMessage.message_id;
  }

  /**
   * Удаляет сообщение
   * @param {number} chatId - ID чата
   * @param {number} messageId - ID сообщения
   */
  async deleteMessage(chatId, messageId) {
    try {
      await this.bot.deleteMessage(chatId, messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
      // Игнорируем ошибки, если сообщение уже удалено или не существует
    }
  }

  /**
   * Отправляет общее сообщение об ошибке
   * @param {number} chatId - ID чата
   * @param {string} errorText - Текст ошибки
   */
  async sendErrorMessage(chatId, errorText) {
    await this.bot.sendMessage(chatId, errorText);
  }

  /**
   * Отправляет сообщение с ходом игрока
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   * @returns {Promise<number>} ID отправленного сообщения
   */
  async sendPlayerTurnMessage(chatId, player) {
    const trackName = player.inFastTrack ? '🚀 Скоростная дорожка' : '🐀 Крысинные бега';

    let message = `🎯 Ваш ход, ${player.username} (${player.profession})!\n\n`;
    message += `💰 Баланс: ${formatNumber(player.cash)} ₽\n`;
    message += `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/мес\n`;
    message += `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/мес\n`;
    message += `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес\n`;
    message += `📍 ${trackName}, поле ${player.position + 1}\n\n`;
    message += `Выберите действие:`;

    const keyboard = (player.charityEffect && player.charityTurnsLeft > 0) ? charityKeyboard : gameKeyboard;

    const sentMessage = await this.bot.sendMessage(chatId, message, {
      reply_markup: keyboard
    });

    return sentMessage.message_id;
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

      message += `💰 День выплат!\n${action}: ${formatNumber(absPayday)} тыс ₽\n\n`;
    }

    message += `📍 ${fieldName}\n\n`;
    message += `💰 Баланс: ${formatNumber(updatedCash)} тыс ₽\n`;
    message += `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/мес\n`;
    message += `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/мес\n`;
    message += `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес\n\n`;
    message += `Выберите действие:`;

    const keyboard = (player.charityEffect && player.charityTurnsLeft > 0) ? charityKeyboard : gameKeyboard;

    await this.bot.sendMessage(chatId, message, {
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
}

module.exports = MessageService;
