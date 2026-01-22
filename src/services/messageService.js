const { formatNumber, RateLimiter } = require('../utils');
const { welcomeKeyboard, endGameVoteKeyboard, waitingRoomKeyboard, gameKeyboard, bankruptcyKeyboard, charityKeyboard, fastTrackCharityKeyboard, dealTypeKeyboard, generateDealKeyboard, generateDreamKeyboard, creditCardKeyboard, profileKeyboard, gameFinishedKeyboard, gameLostKeyboard, developerKeyboard } = require('../utils/keyboards');
const { FIELD_TYPES } = require('../game/board');

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
/rules - Показать правила игры
/newgame - Создать новую игру
/play - Начать игру
/endgame - Начать голосование за окончание игры

*О игре:*
CashFlow - настольная игра о финансовом планировании.
    `;

    await this.sendMessage(chatId, helpText.trim(), { parse_mode: 'Markdown', reply_markup: developerKeyboard });
  }

  /**
   * Отправляет сообщение с правилами игры
   * @param {number} chatId - ID чата
   */
  async sendRulesMessage(chatId) {
    const rulesText = `
*🎯 ПРАВИЛА ИГРЫ CASHFLOW*

*Цель игры:*
Выйти из "крысиных бегов" и достичь финансовой свободы! Это происходит, когда ваш пассивный доход превышает ежемесячные расходы.

*🎮 ПОДГОТОВКА К ИГРЕ*

1. Нажмите "🎮 Играть!" для создания новой игры
2. Все игроки выбирают свою "мечту" (финансовую цель)
3. Игра начинается с равными начальными условиями

*📍 ПОЛЯ ДОСКИ*

Игра проходит по круговой доске с разными типами полей:

• *💰 День выплат* - получаете зарплату + пассивный доход - расходы
• *💼 Сделка* - инвестиционные возможности (мелкие/крупные сделки)
• *📈 Рынок* - продажа активов по рыночным ценам
• *❤️ Благотворительность* - пожертвуйте 10% дохода за бонус на 3 хода
• *👶 Ребенок* - расходы на детей увеличиваются
• *🏭 Безработица* - оплатите расходы или пропустите 2 хода

*💹 ФИНАНСОВАЯ МЕХАНИКА*

• *Зарплата* - фиксированный доход от профессии
• *Кредиты* - берутся автоматически при покупке дорогих активов
• *Денежный поток* = Зарплата + Пассивный доход - Расходы
• *Банкротство* - когда денег недостаточно, продаются активы для погашения долгов

*🚀 СКОРОСТНАЯ ДОРОЖКА*

Когда пассивный доход > расходов, вы переходите на Fast Track:
• Другие правила игры
• Более выгодные сделки
• Путь к окончательной финансовой свободе

*⚠️ БАНКРОТСТВО*

Если после дня выплат денег недостаточно:
1. Продаются активы за половину стоимости
2. Оплачиваются кредиты
3. Пропускаются 3 хода для восстановления
4. Цель - снова достичь положительного денежного потока

*🎲 СТРАТЕГИЯ ПОБЕДЫ*

• Покупайте активы с хорошим соотношением цена/доход
• Балансируйте между риском и стабильностью
• Следите за денежным потоком
• Используйте благотворительность стратегически
• Не берите слишком много кредитов

*🏁 ЗАВЕРШЕНИЕ ИГРЫ*

• Любой игрок может начать голосование за окончание
• Требуется большинство голосов (>50%)
• При ничьей игра продолжается
• Побеждает игрок, первым достигший финансовой свободы

*📋 КОМАНДЫ БОТА*
/start - Запуск бота
/help - Справка по командам
/profile - Просмотр профиля и статистики
/endgame - Начать голосование за окончание игры

Удачи в достижении финансовой свободы! 💰
    `;

    await this.sendMessage(chatId, rulesText.trim(), { parse_mode: 'Markdown', reply_markup: developerKeyboard });
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

    let message = `📊 СТАТУС ИГРЫ\n\n`;
    message += `Игра: ${trackName}\n`;
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
      info += `${UserStatsService.formatUserStats(userStats)}\n`;
    }

    if (!player.inFastTrack) info += '\n'

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

    const trackName = player.inFastTrack ? '🚀 Скоростная дорожка' : '🐀 крысиные бега';
    info += `\n📍 ${trackName}, поле ${player.position + 1}`;

    if (player.inFastTrack) {
      info += `\n\n🚀 СКОРОСТНАЯ ДОРОЖКА:`;
      info += `\n💰 Капитал: ${formatNumber(player.fastTrackCash || 0)} ₽`;
      info += `\n💵 Доход: ${formatNumber(player.fastTrackIncome || 0)} ₽/мес`;
      info += `\n🎯 Цель (мечта): ${formatNumber(player.dreamCost || 0)} ₽`;
    } else {
      if (player.cashFlow > 0) {
        info += `\n\n✅ Положительный денежный поток!`;
      } else {
        info += `\n\n⚠️ Отрицательный денежный поток`;
      }
    }

    // Выбираем клавиатуру в зависимости от статуса игрока
    let keyboard;
    if (player.inFastTrack) {
      // На Fast Track показываем только кнопку активов
      keyboard = {
        inline_keyboard: [
          [
            { text: '🏠 Активы', callback_data: 'assets' }
          ]
        ]
      };
    } else {
      // На Rat Race показываем обе кнопки
      keyboard = profileKeyboard;
    }

    await this.sendMessage(chatId, info, { reply_markup: keyboard });
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
      info += `${UserStatsService.formatUserStats(userStats)}\n`;
    }

    if (!player.inFastTrack) info += '\n'

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


      const trackName = player.inFastTrack ? '🚀 Скоростная дорожка' : '🐀 крысиные бега';
      info += `📍 ${trackName}, поле ${player.position + 1}`;

      if (player.inFastTrack) {
        info += `\n\n🚀 СКОРОСТНАЯ ДОРОЖКА:`;
        info += `\n💰 Капитал: ${formatNumber(player.fastTrackCash || 0)} ₽`;
        info += `\n💵 Доход: ${formatNumber(player.fastTrackIncome || 0)} ₽/мес`;
        info += `\n🎯 Цель (мечта): ${formatNumber(player.dreamCost || 0)} ₽`;
      } else {
        if (player.cashFlow > 0) {
          info += `\n\n✅ Положительный денежный поток!`;
        } else {
          info += `\n\n⚠️ Отрицательный денежный поток`;
        }
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
    await this.sendMessage(chatId, message, { reply_markup: gameFinishedKeyboard });
  }

  /**
   * Отправляет сообщение о проигрыше в банкротстве
   * @param {number} chatId - ID чата
   */
  async sendGameLostMessage(chatId) {
    const message = '🥺 Вы проиграли! \nУ вас нет активов для продажи и недостаточно денег для оплаты кредитов.';
    await this.sendMessage(chatId, message, { reply_markup: gameLostKeyboard });
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
    const playersList = game.players.map(player => {
      const status = player.dream ? '✅' : '❌';
      return `${status} ${player.username}`;
    }).join('\n');

    const allDreamsSelected = game.players.every(player => player.dream);
    const waitingText = allDreamsSelected
      ? 'Все игроки выбрали мечту! Можно начинать игру.'
      : 'Ожидание выбора мечты всеми игроками...';

    const message = `🎮 Комната ожидания\n\nИгроки:\n${playersList}\n\n${waitingText}`;

    // Всегда показывать кнопку присоединения
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🎮 Присоединиться к игре', callback_data: 'play' }
        ],
        [
          { text: '📋 Правила игры', callback_data: 'rules' },
          { text: '❓ Помощь', callback_data: 'help' }
        ]
      ]
    };

    // Добавить кнопку "start_game" в зависимости от статуса выбора мечты
    if (allDreamsSelected) {
      keyboard.inline_keyboard.push([
        { text: '🚀 Начать игру', callback_data: 'start_game' }
      ]);
    } else {
      keyboard.inline_keyboard.push([
        { text: '🚫 Нельзя начать (не все выбрали мечту)', callback_data: 'start_game_blocked' }
      ]);
    }

    const sentMessage = await this.sendMessage(chatId, message, {
      reply_markup: keyboard
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
    const playersList = game.players.map(player => {
      const status = player.dream ? '✅' : '❌';
      return `${status} ${player.username}`;
    }).join('\n');

    const allDreamsSelected = game.players.every(player => player.dream);
    const waitingText = allDreamsSelected
      ? 'Все игроки выбрали мечту! Можно начинать игру.'
      : 'Ожидание выбора мечты всеми игроками...';

    const message = `🎮 Комната ожидания\n\nИгроки:\n${playersList}\n\n${waitingText}`;

    // Всегда показывать кнопку присоединения
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🎮 Присоединиться к игре', callback_data: 'play' }
        ],
        [
          { text: '📋 Правила игры', callback_data: 'rules' },
          { text: '❓ Помощь', callback_data: 'help' }
        ]
      ]
    };

    // Добавить кнопку "start_game" в зависимости от статуса выбора мечты
    if (allDreamsSelected) {
      keyboard.inline_keyboard.push([
        { text: '🚀 Начать игру', callback_data: 'start_game' }
      ]);
    } else {
      keyboard.inline_keyboard.push([
        { text: '🚫 Нельзя начать (не все выбрали мечту)', callback_data: 'start_game_blocked' }
      ]);
    }

    await this.editMessageText(chatId, messageId, message, {
      reply_markup: keyboard
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
      if (error.code === 'ETELEGRAM' && error.response && error.response.statusCode === 400 &&
        error.response.body && error.response.body.description &&
        error.response.body.description.includes('message is not modified')) {
        // Keyboard already removed, ignore this error
      } else {
        console.error('Error removing keyboard:', error);
        // Игнорируем другие ошибки, если сообщение уже изменено или не существует
      }
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
   * Отправляет сообщение выбора мечты с пагинацией
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   * @param {number} page - Страница для пагинации (начиная с 0)
   * @param {number} messageId - ID сообщения для редактирования (опционально)
   * @param {Array} selectedDreams - Массив названий уже выбранных мечтаний
   */
  async sendDreamSelectionMessage(chatId, player, page = 0, messageId = null, selectedDreams = []) {
    const content = this.generateDreamSelectionContent(player, page, selectedDreams);

    if (messageId) {
      // Редактируем существующее сообщение
      await this.editMessageText(chatId, messageId, content.text, {
        parse_mode: 'Markdown',
        reply_markup: content.keyboard
      });
    } else {
      // Отправляем новое сообщение
      const sentMessage = await this.sendMessage(chatId, content.text, {
        parse_mode: 'Markdown',
        reply_markup: content.keyboard
      });
      return sentMessage.message_id;
    }
  }

  /**
   * Генерирует текст и клавиатуру для сообщения выбора мечты с пагинацией
   * @param {Object} player - Объект игрока
   * @param {number} page - Страница для пагинации (начиная с 0)
   * @param {Array} selectedDreams - Массив названий уже выбранных мечтаний
   * @returns {Object} Объект с text и keyboard
   */
  generateDreamSelectionContent(player, page = 0, selectedDreams = []) {
    const { FAST_TRACK_FIELDS, FIELD_TYPES } = require('../game/board');
    const ITEMS_PER_PAGE = 5;

    // Получаем список мечтаний (полей типа DREAM), исключая уже выбранные другими игроками
    const dreams = FAST_TRACK_FIELDS.filter(field =>
      field.type === FIELD_TYPES.DREAM &&
      !selectedDreams.includes(field.id)
    );
    const totalPages = Math.ceil(dreams.length / ITEMS_PER_PAGE);
    const startIndex = page * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, dreams.length);
    const pageDreams = dreams.slice(startIndex, endIndex);

    let message = `🎯 ${player.username}, выбери свою мечту!\n\n`;
    message += `💼 Ваша профессия: ${player.profession}\n\n`;
    message += `Выберите одну из следующих мечтаний:\n\n`;

    const keyboard = {
      inline_keyboard: []
    };

    pageDreams.forEach((dream, index) => {
      const globalIndex = startIndex + index;
      message += `${globalIndex + 1}. **${dream.title}**\n`;
      message += `   ${dream.description}\n\n`;

      keyboard.inline_keyboard.push([{
        text: `${globalIndex + 1}. ${dream.title}`,
        callback_data: `select_dream_${dream.id}`
      }]);
    });

    message += `Страница ${page + 1} из ${totalPages}\n\n`;
    message += `Выберите мечту, которая мотивирует вас в игре!`;

    // Кнопки навигации
    const navButtons = [];
    if (page > 0) {
      navButtons.push({ text: '⬅️ Назад', callback_data: `dream_page_${page - 1}` });
    }
    if (page < totalPages - 1) {
      navButtons.push({ text: 'Вперед ➡️', callback_data: `dream_page_${page + 1}` });
    }
    if (navButtons.length > 0) {
      keyboard.inline_keyboard.push(navButtons);
    }

    return { text: message, keyboard };
  }

  /**
   * Отправляет сообщение о переходе игрока на скоростную дорожку
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   */
  async sendFastTrackTransitionMessage(chatId, player) {
    const message = `🎉 ${player.username} перешел на скоростную дорожку!`;
    await this.sendMessage(chatId, message);
  }

  /**
   * Отправляет сообщение с ходом игрока
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   * @returns {Promise<number>} ID отправленного сообщения
   */
  async sendPlayerTurnMessage(chatId, player) {
    const trackName = player.inFastTrack ? '🚀 Скоростная дорожка' : '🐀 крысиные бега';

    let message = `🎯 Ваш ход, ${player.profession} ${player.username}!\n\n`;

    if (player.inFastTrack) {
      // Fast Track финансы
      message += `🚀 СКОРОСТНАЯ ДОРОЖКА:\n`;
      message += `💰 Капитал: ${formatNumber(player.fastTrackCash || 0)} ₽\n`;
      message += `💵 Доход: ${formatNumber(player.fastTrackIncome || 0)} ₽/мес\n`;
      message += `🎯 Цель (мечта): ${formatNumber(player.dreamCost || 0)} ₽\n`;

      // Прогресс к цели
      const dreamCost = player.dreamCost || 0;
      if (dreamCost > 0) {
        const progressPercent = ((player.fastTrackIncome / dreamCost) * 100).toFixed(1);
        const remaining = Math.max(0, dreamCost - player.fastTrackIncome);
        message += `📊 Прогресс: ${progressPercent}% (осталось: ${formatNumber(remaining)} ₽)\n\n`;
      } else {
        message += `\n`;
      }
    } else {
      // Rat Race финансы
      message += `💰 Баланс: ${formatNumber(player.cash)} ₽\n`;
      message += `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/мес\n`;
      message += `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/мес\n`;
      message += `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес\n\n`;
    }

    message += `📍 ${trackName}, поле ${player.position + 1}\n\n`;

    let keyboard;
    if (player.bankruptcyState) {
      message += `🚨 Вы в состоянии банкротства!\nПродайте активы и оплатите долги, чтобы восстановить положительный денежный поток.`;
      keyboard = bankruptcyKeyboard;
    } else if (player.charityEffect) {
      message += `Выберите действие:`;
      if (player.inFastTrack) {
        keyboard = fastTrackCharityKeyboard;
      } else {
        keyboard = charityKeyboard;
      }
    } else {
      message += `Выберите действие:`;
      keyboard = gameKeyboard;
    }

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
   * Отправляет комбинированное сообщение с броском, перемещением, выплатами и ходом игрока (для Rat Race)
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   * @param {number} steps - Количество шагов
   * @param {number} newPosition - Новая позиция
   * @param {string} fieldType - Тип поля
   * @param {Array} paydayEvents - Массив событий выплат
   *
   * Примечание: Для поля PAYDAY клавиатура не отправляется, так как никаких действий не требуется
   */
  async sendCombinedRollMovePaydayMessage(chatId, player, steps, newPosition, fieldType, paydayEvents = []) {
    const trackName = '🐀 крысиные бега';
    const fieldName = this.getFieldName(fieldType);

    let message = `🎲 ${player.profession} ${player.username} выкинул ${steps} шагов\n`;
    message += `📍 ${trackName}, поле ${newPosition + 1}\n\n`;

    // Суммируем выплаты
    let totalPayday = 0;
    let updatedFastTrackCash = player.fastTrackCash || 0;
    if (paydayEvents && paydayEvents.length > 0) {
      for (const event of paydayEvents) {
        // Для Fast Track используем newFastTrackCash из события
        if (event.newFastTrackCash !== undefined) {
          totalPayday += event.cashFlow;
          updatedFastTrackCash = event.newFastTrackCash;
        } else {
          // Для обычных полей используем cashFlow
          totalPayday += event.cashFlow;
        }
      }
      // Если нет специального newFastTrackCash, добавляем сумму к текущему балансу
      if (paydayEvents.every(event => event.newFastTrackCash === undefined)) {
        updatedFastTrackCash += totalPayday;
      }

      // Показываем информацию о выплатах только если сумма не равна 0
      if (totalPayday !== 0) {
        const action = totalPayday >= 0 ? 'Получено' : 'Уплачено';
        const absPayday = Math.abs(totalPayday);

        message += `💰 День выплат!\n${action}: ${formatNumber(absPayday)} ₽\n\n`;
      }
    }

    message += `💰 Баланс: ${formatNumber(updatedFastTrackCash)} ₽\n`;
    message += `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/мес\n`;
    message += `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/мес\n`;
    message += `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес\n\n`;

    // Для поля PAYDAY не отправляем клавиатуру и не добавляем текст "Выберите действие:"
    const { FIELD_TYPES } = require('../game/board');
    if (fieldType === FIELD_TYPES.PAYDAY) {
      await this.sendMessage(chatId, message);
    } else {
      message += `Выберите действие:`;
      let keyboard = gameKeyboard;
      if (player.charityEffect) {
        keyboard = player.inFastTrack ? fastTrackCharityKeyboard : charityKeyboard;
      }
      await this.sendMessage(chatId, message, {
        reply_markup: keyboard
      });
    }
  }

  /**
   * Отправляет комбинированное сообщение с броском, перемещением, выплатами и ходом игрока для Fast Track
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   * @param {number} steps - Количество шагов
   * @param {number} newPosition - Новая позиция
   * @param {string} fieldType - Тип поля
   * @param {Array} paydayEvents - Массив событий выплат
   */
  async sendFastTrackRollMoveMessage(chatId, player, steps, newPosition, fieldType, paydayEvents = []) {
    const trackName = '🚀 Скоростная дорожка';

    let message = `🎲 ${player.profession} ${player.username} выкинул ${steps} шагов\n`;
    message += `📍 ${trackName}, поле ${newPosition + 1}\n\n`;

    // Суммируем выплаты
    let totalPayday = 0;
    let updatedFastTrackCash = player.fastTrackCash || 0;
    if (paydayEvents && paydayEvents.length > 0) {
      for (const event of paydayEvents) {
        // Для Fast Track используем newFastTrackCash из события
        if (event.newFastTrackCash !== undefined) {
          totalPayday += event.cashFlow;
          updatedFastTrackCash = event.newFastTrackCash;
        } else {
          // Для обычных полей используем cashFlow
          totalPayday += event.cashFlow;
        }
      }
      // Если нет специального newFastTrackCash, добавляем сумму к текущему балансу
      if (paydayEvents.every(event => event.newFastTrackCash === undefined)) {
        updatedFastTrackCash += totalPayday;
      }

      // Показываем информацию о выплатах только если сумма не равна 0
      if (totalPayday !== 0) {
        const action = totalPayday >= 0 ? 'Получено' : 'Уплачено';
        const absPayday = Math.abs(totalPayday);

        message += `💰 День выплат!\n${action}: ${formatNumber(absPayday)} ₽\n\n`;
      }
    }

    // Fast Track финансы
    message += `🚀 СКОРОСТНАЯ ДОРОЖКА:\n`;
    message += `💰 Капитал: ${formatNumber(updatedFastTrackCash)} ₽\n`;
    message += `💵 Доход: ${formatNumber(player.fastTrackIncome || 0)} ₽/мес\n`;
    message += `🎯 Цель (мечта): ${formatNumber(player.dreamCost || 0)} ₽/мес\n`;

    // Прогресс к цели
    const dreamCost = player.dreamCost || 0;
    if (dreamCost > 0) {
      const progressPercent = ((player.fastTrackIncome / dreamCost) * 100).toFixed(1);
      const remaining = Math.max(0, dreamCost - player.fastTrackIncome);
      message += `📊 Прогресс: ${progressPercent}% (осталось: ${formatNumber(remaining)} ₽)\n\n`;
    } else {
      message += `\n`;
    }

    // Для поля PAYDAY не отправляем клавиатуру и не добавляем текст "Выберите действие:"
    const { FIELD_TYPES } = require('../game/board');
    if (fieldType === FIELD_TYPES.PAYDAY) {
      await this.sendMessage(chatId, message);
    } else {
      message += `Выберите действие:`;
      let keyboard = gameKeyboard;
      if (player.charityEffect) {
        keyboard = player.inFastTrack ? fastTrackCharityKeyboard : charityKeyboard;
      }
      await this.sendMessage(chatId, message, {
        reply_markup: keyboard
      });
    }
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
   * Отправляет комбинированное сообщение с броском, перемещением, выплатами и полем "Сделки" (для Rat Race)
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   * @param {number} steps - Количество шагов
   * @param {number} newPosition - Новая позиция
   * @param {Array} paydayEvents - Массив событий выплат
   */
  async sendCombinedRollMoveDealMessage(chatId, player, steps, newPosition, paydayEvents = []) {
    const trackName = '🐀 крысиные бега';

    let message = `🎲 ${player.profession} ${player.username} выкинул ${steps} шагов\n`;
    message += `📍 ${trackName}, поле ${newPosition + 1}\n\n`;

    // Суммируем выплаты
    let totalPayday = 0;
    let updatedFastTrackCash = player.fastTrackCash || 0;
    if (paydayEvents && paydayEvents.length > 0) {
      for (const event of paydayEvents) {
        // Для Fast Track используем newFastTrackCash из события
        if (event.newFastTrackCash !== undefined) {
          totalPayday += event.cashFlow;
          updatedFastTrackCash = event.newFastTrackCash;
        } else {
          // Для обычных полей используем cashFlow
          totalPayday += event.cashFlow;
        }
      }
      // Если нет специального newFastTrackCash, добавляем сумму к текущему балансу
      if (paydayEvents.every(event => event.newFastTrackCash === undefined)) {
        updatedFastTrackCash += totalPayday;
      }

      // Показываем информацию о выплатах только если сумма не равна 0
      if (totalPayday !== 0) {
        const action = totalPayday >= 0 ? 'Получено' : 'Уплачено';
        const absPayday = Math.abs(totalPayday);

        message += `💰 День выплат!\n${action}: ${formatNumber(absPayday)} ₽\n\n`;
      }
    }

    message += `💼 Вы попали на поле "Сделки"\n\n`;
    message += `💰 Баланс: ${formatNumber(updatedFastTrackCash)} ₽\n`;
    message += `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/мес\n`;
    message += `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/мес\n`;
    message += `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес\n\n`;
    message += `Выберите тип сделки:`;

    await this.sendMessage(chatId, message, {
      reply_markup: dealTypeKeyboard
    });
  }

  /**
   * Отправляет комбинированное сообщение с броском, перемещением, выплатами и полем "Благотворительность"
   * @param {Object} bot - Объект бота Telegram
   * @param {Object} player - Объект игрока
   * @param {Object} game - Объект игры
   */
  async sendCombinedRollMoveCharityMessage(bot, player, game) {
    const trackName = player.inFastTrack ? '🚀 Скоростная дорожка' : '🐀 крысиные бега';

    let message = `🎲 ${player.profession} ${player.username} попал на поле "Благотворительность"!\n\n`;
    message += `📍 ${trackName}, поле "Благотворительность"\n\n`;

    message += `❤️ Вы можете пожертвовать 10% своего дохода на благотворительность\n\n`;
    message += `🎁 Взамен на следующих 3 ходах можно будет бросать 1 или 2 кубика\n\n`;

    const income = player.salary + player.passiveIncome;
    const donationAmount = Math.floor(income * 0.1);

    message += `💰 Ваш доход: ${formatNumber(income)} ₽/месяц\n`;
    message += `💸 Пожертвование: ${formatNumber(donationAmount)} ₽\n\n`;
    message += `💰 Баланс: ${formatNumber(player.fastTrackCash)} ₽\n\n`;
    message += `Что вы хотите сделать?`;

    const { charityChoiceKeyboard } = require('../utils/keyboards');

    // Отправляем сообщение в чат игры (предполагаем, что chatId хранится в game или получаем его из player)
    // Поскольку у нас нет прямого доступа к chatId, используем bot для отправки в личные сообщения или в групповой чат
    // Для простоты отправим в чат, где происходит игра (предполагаем game.chatId)
    const chatId = game.chatId; // Предполагаем, что chatId есть в game

    await this.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: charityChoiceKeyboard
    });
  }

  /**
   * Отправляет комбинированное сообщение с броском, перемещением, выплатами и полем "Miscellaneous" (для Rat Race)
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   * @param {number} steps - Количество шагов
   * @param {number} newPosition - Новая позиция
   * @param {Array} paydayEvents - Массив событий выплат
   * @param {Object} miscCard - Объект miscellaneous карточки
   * @param {Object} game - Объект игры
   */
  async sendCombinedRollMoveMiscellaneousMessage(chatId, player, steps, newPosition, paydayEvents = [], miscCard, game) {
    const trackName = '🐀 крысиные бега';

    let message = `🎲 ${player.profession} ${player.username} выкинул ${steps} шагов\n`;
    message += `📍 ${trackName}, поле ${newPosition + 1}\n\n`;

    // Суммируем выплаты
    let totalPayday = 0;
    let updatedFastTrackCash = player.fastTrackCash || 0;
    if (paydayEvents && paydayEvents.length > 0) {
      for (const event of paydayEvents) {
        // Для Fast Track используем newFastTrackCash из события
        if (event.newFastTrackCash !== undefined) {
          totalPayday += event.cashFlow;
          updatedFastTrackCash = event.newFastTrackCash;
        } else {
          // Для обычных полей используем cashFlow
          totalPayday += event.cashFlow;
        }
      }
      // Если нет специального newFastTrackCash, добавляем сумму к текущему балансу
      if (paydayEvents.every(event => event.newFastTrackCash === undefined)) {
        updatedFastTrackCash += totalPayday;
      }

      // Показываем информацию о выплатах только если сумма не равна 0
      if (totalPayday !== 0) {
        const action = totalPayday >= 0 ? 'Получено' : 'Уплачено';
        const absPayday = Math.abs(totalPayday);

        message += `💰 День выплат!\n${action}: ${formatNumber(absPayday)} ₽\n\n`;
      }
    }

    message += `🎭 Вы попали на поле "Всякая всячина"\n\n`;
    message += `📝 ${miscCard.description}\n\n`;

    if (miscCard.cost) {
      message += `💰 Оплатите ${formatNumber(miscCard.cost)} ₽\n`;
    }

    if (miscCard.mortgage) {
      message += `\n🏠 Ипотека: ${formatNumber(miscCard.mortgage)} ₽\n`;
    }

    if (miscCard.downPayment) {
      message += `🏦 Первоначальный взнос: ${formatNumber(miscCard.downPayment)} ₽\n`;
    }

    message += `\n💰 Баланс: ${formatNumber(updatedCash)} ₽\n`;

    // Проверяем условия
    let canPay = true;
    if (miscCard.hasKids && (!player.childrenCount || player.childrenCount === 0)) {
      message += `\n❌ У вас нет детей для этой карточки!`;
      canPay = false;
    }

    // Генерируем клавиатуру
    const keyboard = this.generateMiscellaneousKeyboard(miscCard, player, canPay);

    await this.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  /**
   * Отправляет комбинированное сообщение с броском, перемещением, выплатами и полем "Безработица" (для Rat Race)
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   * @param {number} steps - Количество шагов
   * @param {number} newPosition - Новая позиция
   * @param {Array} paydayEvents - Массив событий выплат
   */
  async sendCombinedRollMoveDismissalMessage(chatId, player, steps, newPosition, paydayEvents = []) {
    const trackName = '🐀 крысиные бега';

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

    message += `🏭 Безработица!\n\n`;
    message += `📝 Вы временно потеряли свою работу!\n`;
    message += `💰 Оплатите размер ваших «Общих Расходов» и пропустите 2 хода.\n\n`;
    message += `💸 Общие расходы: ${formatNumber(player.totalExpenses)} ₽\n`;
    message += `💰 Баланс: ${formatNumber(updatedCash)} ₽\n\n`;
    message += `Что вы хотите сделать?`;

    // Генерируем клавиатуру
    const { generateDismissalKeyboard } = require('../utils/keyboards');
    const keyboard = generateDismissalKeyboard(player.totalExpenses);

    await this.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  /**
   * Отправляет комбинированное сообщение с броском, перемещением, выплатами и полем "Ребенок" (для Rat Race)
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   * @param {number} steps - Количество шагов
   * @param {number} newPosition - Новая позиция
   * @param {Array} paydayEvents - Массив событий выплат
   */
  async sendCombinedRollMoveChildMessage(chatId, player, steps, newPosition, paydayEvents = []) {
    const trackName = '🐀 крысиные бега';

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

    message += `👶 Рождение ребенка!\n\n`;
    message += `📝 У вас родился ребенок!\n`;
    message += `💸 Ваши расходы увеличились на ${formatNumber(player.kidCost)} ₽\n\n`;
    message += `👨‍👩‍👧‍👦 Детей: ${player.childrenCount}\n`;
    message += `💰 Баланс: ${formatNumber(updatedCash)} ₽\n`;
    message += `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/мес\n`;
    message += `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/мес\n`;
    message += `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес\n\n`;

    await this.sendMessage(chatId, message, {
      parse_mode: 'Markdown'
    });
  }

  /**
   * Отправляет комбинированное сообщение с броском, перемещением, выплатами и полем "Рынок"
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   * @param {number} steps - Количество шагов
   * @param {number} newPosition - Новая позиция
   * @param {boolean} inFastTrack - На Fast Track
   * @param {Array} paydayEvents - Массив событий выплат
   * @param {Object} marketCard - Market карточка
   */
  async sendCombinedRollMoveMarketMessage(chatId, player, steps, newPosition, paydayEvents = [], marketCard) {
    const trackName = '🐀 крысиные бега';

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

    message += `📈 Рынок!\n\n`;
    message += `💼 ${marketCard.title}\n\n`;
    message += `📝 ${marketCard.description}\n\n`;

    // Показать эффекты карточки
    if (marketCard.passiveIncome) {
      message += `💵 Пассивный доход: +${formatNumber(marketCard.passiveIncome)} ₽/мес\n`;
    }

    // Для эффектов продажи показать информацию об активах
    const relatedDeals = marketCard.relatedDeals || [];
    const eligibleAssets = player.assets ? player.assets.filter(asset =>
      relatedDeals.includes(asset.id || asset.title)
    ) : [];

    if (!marketCard.passiveIncome && !marketCard.creditMultiple && !marketCard.inflation) {
      // Эффекты продажи
      if (eligibleAssets.length > 0) {
        message += `🏠 Ваши активы:\n`;
        eligibleAssets.forEach((asset, index) => {
          const sellPrice = calculateMarketSellPrice(marketCard, asset);
          message += `\n${index + 1}. ${asset.title}\n`;
          message += `   💰 Цена продажи: ${formatNumber(sellPrice)} ₽\n`;
          message += `   💵 Доход: ${formatNumber(asset.cashFlow || 0)} ₽/мес\n`;
        });
      } else {
        message += `У вас нет подходящих активов для продажи.\n`;
      }
    }

    message += `\n💰 Баланс: ${formatNumber(updatedCash)} ₽\n`;
    message += `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/мес\n`;
    message += `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/мес\n`;
    message += `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес\n\n`;

    // Генерируем клавиатуру
    const keyboard = this.generateMarketKeyboard(marketCard, player);

    await this.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  /**
   * Отправляет комбинированное сообщение с броском, перемещением, выплатами и fastTrack событием
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   * @param {number} steps - Количество шагов
   * @param {number} newPosition - Новая позиция
   * @param {boolean} inFastTrack - На Fast Track
   * @param {Array} paydayEvents - Массив событий выплат
   * @param {Object} fastTrackEvent - fastTrack событие
   * @param {Object} game - Объект игры для проверки занятости полей
   */
  async sendCombinedRollMoveFastTrackMessage(chatId, player, steps, newPosition, paydayEvents = [], fastTrackEvent, game, gameService) {
    const trackName = '🚀 Скоростная дорожка';

    let message = `🎲 ${player.profession} ${player.username} выкинул ${steps} шагов\n`;
    message += `📍 ${trackName}, поле ${newPosition + 1}\n\n`;

    // Суммируем выплаты
    let totalPayday = 0;
    let updatedFastTrackCash = player.fastTrackCash || 0;
    if (paydayEvents && paydayEvents.length > 0) {
      for (const event of paydayEvents) {
        // Для Fast Track используем newFastTrackCash из события
        if (event.newFastTrackCash !== undefined) {
          totalPayday += event.cashFlow;
          updatedFastTrackCash = event.newFastTrackCash;
        } else {
          // Для обычных полей используем cashFlow
          totalPayday += event.cashFlow;
        }
      }
      // Если нет специального newFastTrackCash, добавляем сумму к текущему балансу
      if (paydayEvents.every(event => event.newFastTrackCash === undefined)) {
        updatedFastTrackCash += totalPayday;
      }

      const action = totalPayday >= 0 ? 'Получено' : 'Уплачено';
      const absPayday = Math.abs(totalPayday);

      message += `💰 День выплат!\n${action}: ${formatNumber(absPayday)} ₽\n\n`;
    }

    // Определяем тип поля для обозначения
    let fieldTypeLabel = '';
    const { FIELD_TYPES } = require('../game/board');

    switch (fastTrackEvent.type) {
      case FIELD_TYPES.INVESTING:
        fieldTypeLabel = 'Инвестиция:';
        break;
      case FIELD_TYPES.EXPENSES:
        fieldTypeLabel = 'Расходы:';
        break;
      case FIELD_TYPES.CHARITY:
        fieldTypeLabel = 'Благотворительность:';
        break;
      case FIELD_TYPES.DREAM:
        fieldTypeLabel = 'Мечта:';
        break;
      case FIELD_TYPES.PAYDAY:
        fieldTypeLabel = 'День выплат:';
        break;
      default:
        fieldTypeLabel = '';
    }

    message += `💼 ${fieldTypeLabel ? fieldTypeLabel + ' ' : ''}${fastTrackEvent.title}\n\n`;

    // Проверяем наличие description перед добавлением
    if (fastTrackEvent.description) {
      message += `📝 ${fastTrackEvent.description}\n\n`;
    }

    // Добавляем информацию об оплате для полей с cost
    if (fastTrackEvent.data && fastTrackEvent.data.cost) {
      message += `💰 Требуется оплата: ${formatNumber(fastTrackEvent.data.cost)} ₽\n\n`;
    }

    // Показать параметры события
    if (fastTrackEvent.data.cost && fastTrackEvent.data.passiveIncome) {
      message += `💰 Стоимость: ${formatNumber(fastTrackEvent.data.cost)} ₽\n`;
      message += `💵 Пассивный доход: ${formatNumber(fastTrackEvent.data.passiveIncome)} ₽/мес\n`;
    } else if (fastTrackEvent.data.cost) {
      message += `💰 Стоимость: ${formatNumber(fastTrackEvent.data.cost)} ₽\n`;
    } else if (fastTrackEvent.data.expenseBalanceMultiply) {
      const playerBalance = player.fastTrackCash || 0;
      const amount = Math.floor(playerBalance * fastTrackEvent.data.expenseBalanceMultiply);
      message += `💸 Расходы: ${formatNumber(amount)} ₽ (${fastTrackEvent.data.expenseBalanceMultiply * 100}% от баланса)\n`;
    } else if (fastTrackEvent.data.cash) {
      message += `💰 Получение: ${formatNumber(fastTrackEvent.data.cash)} ₽\n`;
    } else if (fastTrackEvent.data.charity) {
      message += `❤️ Благотворительность - выбор количества кубиков\n`;
    } else if (fastTrackEvent.data.dice) {
      message += `🎲 Рискованное событие (кубик >= ${fastTrackEvent.data.dice})\n`;
      if (fastTrackEvent.data.cash) {
        message += `💰 Награда: ${formatNumber(fastTrackEvent.data.cash)} ₽\n`;
      }
      if (fastTrackEvent.data.passiveIncome) {
        message += `💵 Пассивный доход: ${formatNumber(fastTrackEvent.data.passiveIncome)} ₽/мес\n`;
      }
    }

    message += `\n💰 Капитал: ${formatNumber(updatedFastTrackCash)} ₽\n`;

    if (!player.inFastTrack) {
      message += `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/мес\n`;
      message += `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/мес\n`;
      message += `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес\n\n`;
    } else {
      message += `\n`;
    }

    message += `Что вы хотите сделать?`;

    // Генерируем клавиатуру для fastTrack события
    let keyboard;
    if (fastTrackEvent.type === FIELD_TYPES.DREAM) {
      // Для мечты используем специальную клавиатуру
      const { generateDreamKeyboard } = require('../utils/keyboards');
      keyboard = generateDreamKeyboard(fastTrackEvent, player, game.players);
    } else {
      keyboard = this.generateFastTrackKeyboard(fastTrackEvent, player, game, gameService);
    }

    await this.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  /**
   * Генерирует клавиатуру для fastTrack события
   * @param {Object} fastTrackEvent - fastTrack событие
   * @param {Object} player - Объект игрока
   * @param {Object} game - Объект игры
   * @param {Object} gameService - Сервис игры
   * @returns {Object} Клавиатура
   */
  generateFastTrackKeyboard(fastTrackEvent, player, game, gameService) {
    const keyboard = {
      inline_keyboard: []
    };

    const eventData = fastTrackEvent.data || {};

    // Используем switch по типу поля для лучшей читаемости
    switch (fastTrackEvent.type) {

      case FIELD_TYPES.CHARITY:
        // Благотворительность - оплата за эффект
        if (eventData.cost) {
          keyboard.inline_keyboard.push([{
            text: `💰 Пожертвовать ${formatNumber(eventData.cost)} ₽`,
            callback_data: 'pay_fastTrack'
          }]);
        }
        break;

      case FIELD_TYPES.EXPENSES:
        // Расходы - оплата процента от баланса
        if (eventData.expenseBalanceMultiply) {
          const playerBalance = player.fastTrackCash || 0;
          const amount = Math.floor(playerBalance * eventData.expenseBalanceMultiply);
          keyboard.inline_keyboard.push([{
            text: `💸 Оплатить ${formatNumber(amount)} ₽`,
            callback_data: 'pay_fastTrack'
          }]);
        }
        break;

      case FIELD_TYPES.INVESTING:
        // Инвестиции - проверяем занятость поля
        const occupationCheck = gameService.isFastTrackFieldOccupied(game.gameId, player.userId, fastTrackEvent);
        if (occupationCheck.success && occupationCheck.occupied) {
          // Поле занято - только кнопка пропуска
          keyboard.inline_keyboard.push([{
            text: '⏭️ Пропустить',
            callback_data: 'skip_fastTrack'
          }]);
        } else {
          // Поле свободно - кнопки инвестирования и пропуска
          if (eventData.dice) {
            // Рискованное событие - бросок кубика
            keyboard.inline_keyboard.push([{
              text: `🎲 Инвестировать ${formatNumber(eventData.cost)} ₽`,
              callback_data: 'invest_fastTrack'
            }]);
          } else if (eventData.cost) {
            // Обычные инвестиции
            keyboard.inline_keyboard.push([{
              text: `💰 Инвестировать ${formatNumber(eventData.cost)} ₽`,
              callback_data: 'invest_fastTrack'
            }]);
          }
          keyboard.inline_keyboard.push([{
            text: '⏭️ Пропустить',
            callback_data: 'skip_fastTrack'
          }]);
        }
        break;

      case FIELD_TYPES.DREAM:
        // Мечты - специальная обработка с кнопками "Купить" и "Пропустить"
        // Клавиатура генерируется в sendCombinedRollMoveFastTrackMessage
        break;

      default:
        // Fallback для неизвестных типов
        if (eventData.cost) {
          keyboard.inline_keyboard.push([{
            text: `💰 Оплатить ${formatNumber(eventData.cost)} ₽`,
            callback_data: 'pay_fastTrack'
          }]);
        }
        break;
    }

    // Для событий без обязательных действий добавляем пропуск
    // Исключаем поля с expenseBalanceMultiply - они всегда требуют оплаты
    if (eventData.cash && !eventData.dice && !eventData.charity && !eventData.expenseBalanceMultiply && fastTrackEvent.type !== FIELD_TYPES.INVESTING) {
      keyboard.inline_keyboard.push([{
        text: '⏭️ Пропустить',
        callback_data: 'skip_fastTrack'
      }]);
    }

    return keyboard;
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
   * Отправляет карточку miscellaneous
   * @param {number} chatId - ID чата
   * @param {Object} miscCard - Объект miscellaneous карточки
   * @param {Object} player - Объект игрока
   * @param {Object} game - Объект игры
   * @returns {Promise<number>} ID отправленного сообщения
   */
  async sendMiscellaneousCardMessage(chatId, miscCard, player, game) {
    const content = this.generateMiscellaneousCardContent(miscCard, player, game);

    const sentMessage = await this.sendMessage(chatId, content.text, {
      parse_mode: 'Markdown',
      reply_markup: content.keyboard
    });

    return sentMessage.message_id;
  }

  /**
   * Генерирует текст и клавиатуру для карточки miscellaneous (без отправки)
   * @param {Object} miscCard - Объект miscellaneous карточки
   * @param {Object} player - Объект игрока
   * @param {Object} game - Объект игры
   * @returns {Object} Объект с text и keyboard
   */
  generateMiscellaneousCardContent(miscCard, player, game) {
    let message = `🎭 **Всякая всячина**\n\n`;
    message += `📝 ${miscCard.description}\n\n`;

    if (miscCard.cost) {
      message += `💰 Стоимость: ${formatNumber(miscCard.cost)} ₽\n`;
    }

    if (miscCard.downPayment) {
      message += `🏦 Первоначальный взнос: ${formatNumber(miscCard.downPayment)} ₽\n`;
    }

    if (miscCard.mortgage) {
      message += `🏠 Ипотека: ${formatNumber(miscCard.mortgage)} ₽\n`;
    }

    if (miscCard.hasKids) {
      message += `👶 Требуется: дети\n`;
    }

    message += `\n💰 Баланс: ${formatNumber(player.cash)} ₽\n`;

    // Проверяем условия
    let canPay = true;
    if (miscCard.hasKids && (!player.childrenCount || player.childrenCount === 0)) {
      message += `\n❌ У вас нет детей для этой карточки!\n`;
      canPay = false;
    }

    if (canPay) {
      message += `\nЧто вы хотите сделать?`;
    }

    // Генерируем клавиатуру
    const keyboard = this.generateMiscellaneousKeyboard(miscCard, player, canPay);

    return { text: message, keyboard };
  }

  /**
   * Генерирует клавиатуру для miscellaneous карточки
   * @param {Object} miscCard - Объект miscellaneous карточки
   * @param {Object} player - Объект игрока
   * @param {boolean} canPay - Можно ли оплатить
   * @returns {Object} Клавиатура
   */
  generateMiscellaneousKeyboard(miscCard, player, canPay = true) {
    const keyboard = {
      inline_keyboard: []
    };

    if (canPay) {
      // Кнопка оплаты наличными
      const payText = miscCard.mortgage ? `Оплатить взнос ${formatNumber(miscCard.downPayment)} ₽` : `Оплатить ${formatNumber(miscCard.cost)} ₽`;
      keyboard.inline_keyboard.push([{
        text: payText,
        callback_data: 'pay_miscellaneous'
      }]);

      // Если карта поддерживает кредит, добавить кнопку оплаты кредиткой
      if (miscCard.credit) {
        keyboard.inline_keyboard.push([{
          text: '💳 Кредитная карта',
          callback_data: 'pay_miscellaneous_credit_card'
        }]);
      }
    } else {
      // Кнопка пропуска (только если нельзя оплатить)
      keyboard.inline_keyboard.push([{
        text: 'Пропустить',
        callback_data: 'skip_miscellaneous'
      }]);
    }

    return keyboard;
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
   * @param {string} type - Тип ('deal', 'miscellaneous', 'dismissal', 'mortgage_down_payment') по умолчанию 'deal'
   * @returns {Promise<number>} ID отправленного сообщения
   */
  async sendCreditCardOfferMessage(chatId, deal, player, type = 'deal') {
    let message = `💼 **${deal.title}**\n\n`;
    if (deal.description) {
      message += `📝 ${deal.description}\n\n`;
    }
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

    // Генерируем клавиатуру в зависимости от типа
    let keyboard;
    if (type === 'mortgage_down_payment') {
      // Для первоначального взноса ипотеки - специальная кнопка
      keyboard = {
        inline_keyboard: [
          [
            { text: '💳 Оплатить первоначальный взнос кредиткой', callback_data: 'buy_mortgage_down_payment_credit_card' }
          ]
        ]
      };
    } else if (type === 'dismissal' || type === 'miscellaneous') {
      // Для безработицы - только кнопка оплаты кредиткой, без пропуска
      keyboard = {
        inline_keyboard: [
          [
            { text: '💳 Оплатить кредиткой', callback_data: 'pay_dismissal_credit_card' }
          ]
        ]
      };
    } else {
      // Для сделок и miscellaneous - стандартная клавиатура с пропуском
      keyboard = creditCardKeyboard;
    }

    const sentMessage = await this.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    return sentMessage.message_id;
  }

  /**
   * Генерирует текст и клавиатуру для сообщения с активами игрока (без отправки)
   * @param {Object} player - Объект игрока
   * @param {number} page - Страница для пагинации (начиная с 0)
   * @returns {Object} Объект с text и keyboard
   */
  generatePlayerAssetsContent(player, page = 0) {
    const ITEMS_PER_PAGE = 5;
    let message = `🏠 АКТИВЫ ${player.username}\n\n`;

    if (player.assets && player.assets.length > 0) {
      const totalPages = Math.ceil(player.assets.length / ITEMS_PER_PAGE);
      const startIndex = page * ITEMS_PER_PAGE;
      const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, player.assets.length);
      const pageAssets = player.assets.slice(startIndex, endIndex);

      pageAssets.forEach((asset, index) => {
        const globalIndex = startIndex + index;
        if (player.bankruptcyState) {
          // В банкротстве показываем кнопки продажи
          const quantity = asset.quantity || 1;
          const totalCost = asset.cost * quantity;
          const sellPrice = Math.floor(totalCost / 2);
          message += `${globalIndex + 1}. ${asset.title}`;
          if (quantity > 1) {
            message += ` (${quantity} шт.)`;
          }
          message += `\n`;
          message += `   💰 Стоимость: ${formatNumber(asset.cost)} ₽`;
          if (quantity > 1) {
            message += ` (за шт., итого: ${formatNumber(totalCost)} ₽)`;
          }
          message += `\n`;
          message += `   💸 Продажа: ${formatNumber(sellPrice)} ₽\n`;
        } else {
          message += `${globalIndex + 1}. ${asset.title}\n`;
          message += `   💰 Стоимость: ${formatNumber(asset.cost)} ₽\n`;
          if (asset.quantity && asset.quantity > 1) {
            message += `   🔢 Количество: ${asset.quantity}\n`;
          }
          if (asset.cashFlow) {
            message += `   💵 Доход: ${formatNumber(asset.cashFlow)} ₽/мес\n`;
          }
        }
        message += `\n`;
      });

      message += `📊 Всего активов: ${player.assetsCount}`;

      // Добавляем баланс и денежный поток в банкротстве
      if (player.bankruptcyState) {
        message += `\n\n💰 Баланс: ${formatNumber(player.cash)} ₽`;
        message += `\n💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес`;
      }

      // Генерируем клавиатуру
      const keyboard = {
        inline_keyboard: []
      };

      // Кнопки активов (только в банкротстве)
      if (player.bankruptcyState) {
        pageAssets.forEach((asset, index) => {
          const globalIndex = startIndex + index;
          const quantity = asset.quantity || 1;
          const sellPrice = Math.floor((asset.cost * quantity) / 2);
          keyboard.inline_keyboard.push([{
            text: `💸 Продать "${asset.title}" за ${formatNumber(sellPrice)} ₽`,
            callback_data: `sell_asset_${globalIndex}`
          }]);
        });
      }

      // Кнопки навигации
      const navButtons = [];
      if (page > 0) {
        navButtons.push({ text: '⬅️ Назад', callback_data: `assets_page_${page - 1}` });
      }
      if (page < totalPages - 1) {
        navButtons.push({ text: 'Вперед ➡️', callback_data: `assets_page_${page + 1}` });
      }
      if (navButtons.length > 0) {
        keyboard.inline_keyboard.push(navButtons);
      }

      return { text: message, keyboard };
    } else {
      message += `У вас пока нет активов.`;
      return { text: message, keyboard: {} };
    }
  }

  /**
   * Отправляет сообщение с активами игрока
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   * @param {number} page - Страница для пагинации (начиная с 0)
   * @param {number} messageId - ID сообщения для редактирования (опционально)
   */
  async sendPlayerAssetsMessage(chatId, player, page = 0, messageId = null) {
    const content = this.generatePlayerAssetsContent(player, page);

    if (messageId) {
      // Редактируем существующее сообщение
      await this.editMessageText(chatId, messageId, content.text, {
        reply_markup: content.keyboard
      });
    } else {
      // Отправляем новое сообщение
      await this.sendMessage(chatId, content.text, { reply_markup: content.keyboard });
    }
  }

  /**
   * Генерирует текст и клавиатуру для сообщения с кредитами игрока (без отправки)
   * @param {Object} player - Объект игрока
   * @param {number} page - Страница для пагинации (начиная с 0)
   * @returns {Object} Объект с text и keyboard
   */
  generatePlayerCreditsContent(player, page = 0) {
    const ITEMS_PER_PAGE = 5;
    let message = `💳 КРЕДИТЫ ${player.username}\n\n`;

    if (player.loansCount && player.loansCount > 0 && player.liabilities && player.liabilities.length > 0) {
      const totalPages = Math.ceil(player.liabilities.length / ITEMS_PER_PAGE);
      const startIndex = page * ITEMS_PER_PAGE;
      const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, player.liabilities.length);
      const pageLiabilities = player.liabilities.slice(startIndex, endIndex);

      message += `📊 Количество кредитов: ${player.loansCount}\n`;
      message += `💰 Общая сумма: ${formatNumber(player.totalLoans)} ₽\n`;
      message += `📉 Ежемесячные платежи: ${formatNumber(player.totalLoanPayments)} ₽/мес\n\n`;

      message += `Подробности:\n`;
      pageLiabilities.forEach((liability, index) => {
        const globalIndex = startIndex + index;
        if (player.bankruptcyState) {
          // В банкротстве показываем кнопки оплаты
          message += `${globalIndex + 1}. ${liability.title}\n`;
          message += `   💰 Сумма: ${formatNumber(liability.loanAmount)} ₽\n`;
        } else {
          message += `${globalIndex + 1}. ${liability.title}\n`;
          message += `   💰 Сумма: ${formatNumber(liability.loanAmount)} ₽\n`;
          message += `   📊 Платеж: ${formatNumber(liability.monthlyPayment)} ₽/месяц\n`;
        }
        message += `\n`;
      });

      // Добавляем баланс и денежный поток
      message += `\n💰 Баланс: ${formatNumber(player.cash)} ₽`;
      message += `\n💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес`;

      // Генерируем клавиатуру
      const keyboard = {
        inline_keyboard: []
      };

      // Кнопки кредитов
      pageLiabilities.forEach((liability, index) => {
        const globalIndex = startIndex + index;
        keyboard.inline_keyboard.push([{
          text: `💸 Оплатить "${liability.title}" за ${formatNumber(liability.loanAmount)} ₽`,
          callback_data: `pay_liability_${globalIndex}`
        }]);
      });

      // Кнопки навигации
      const navButtons = [];
      if (page > 0) {
        navButtons.push({ text: '⬅️ Назад', callback_data: `credits_page_${page - 1}` });
      }
      if (page < totalPages - 1) {
        navButtons.push({ text: 'Вперед ➡️', callback_data: `credits_page_${page + 1}` });
      }
      if (navButtons.length > 0) {
        keyboard.inline_keyboard.push(navButtons);
      }

      return { text: message, keyboard };
    } else {
      message += `У вас нет кредитов.`;
      return { text: message, keyboard: {} };
    }
  }

  /**
   * Отправляет сообщение с кредитами игрока
   * @param {number} chatId - ID чата
   * @param {Object} player - Объект игрока
   * @param {number} page - Страница для пагинации (начиная с 0)
   * @param {number} messageId - ID сообщения для редактирования (опционально)
   */
  async sendPlayerCreditsMessage(chatId, player, page = 0, messageId = null) {
    const content = this.generatePlayerCreditsContent(player, page);

    if (messageId) {
      // Редактируем существующее сообщение
      await this.editMessageText(chatId, messageId, content.text, {
        reply_markup: content.keyboard
      });
    } else {
      // Отправляем новое сообщение
      await this.sendMessage(chatId, content.text, { reply_markup: content.keyboard });
    }
  }

  /**
   * Отправляет market карточку с кнопкой "Пропустить"
   * @param {number} chatId - ID чата
   * @param {Object} marketCard - Market карточка
   * @param {Object} player - Объект игрока
   * @param {Object} game - Объект игры
   */
  async sendMarketCardWithSkipButton(chatId, marketCard, player, game) {
    let message = `📈 **Рынок**\n\n`;
    message += `💼 ${marketCard.title}\n\n`;
    message += `📝 ${marketCard.description}\n\n`;

    if (marketCard.passiveIncome) {
      message += `💵 Пассивный доход: +${formatNumber(marketCard.passiveIncome)} ₽/мес\n`;
    }

    message += `\n💰 Баланс: ${formatNumber(player.cash)} ₽\n`;
    message += `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/мес\n`;
    message += `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/мес\n`;
    message += `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес\n\n`;
    message += `Что вы хотите сделать?`;

    const keyboard = {
      inline_keyboard: [[{
        text: 'Пропустить',
        callback_data: 'skip_market'
      }]]
    };

    await this.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  /**
   * Отправляет market карточку с опциями продажи активов
   * @param {number} chatId - ID чата
   * @param {Object} marketCard - Market карточка
   * @param {Object} player - Объект игрока
   * @param {Object} game - Объект игры
   * @param {string} customTitle - Кастомный заголовок (опционально)
   */
  async sendMarketCardWithSellOptions(chatId, marketCard, player, game, customTitle = null) {
    let message = customTitle ? `${customTitle}\n\n` : '';
    message += `📈 **Рынок**\n\n`;
    message += `💼 ${marketCard.title}\n\n`;
    message += `📝 ${marketCard.description}\n\n`;

    // Найти подходящие активы игрока
    const relatedDeals = marketCard.relatedDeals || [];
    const eligibleAssets = player.assets ? player.assets.filter(asset =>
      relatedDeals.includes(asset.id || asset.title)
    ) : [];

    // Кнопки продажи + кнопка пропустить всегда
    const keyboard = {
      inline_keyboard: []
    };

    // Для карт с passiveIncome не показывать опции продажи, только пропустить
    if (!marketCard.passiveIncome && eligibleAssets.length > 0) {
      message += `🏠 Ваши активы:\n\n`;
      eligibleAssets.forEach((asset, index) => {
        const sellPrice = calculateMarketSellPrice(marketCard, asset);
        message += `${index + 1}. ${asset.title}\n`;
        message += `   💰 Цена продажи: ${formatNumber(sellPrice)} ₽\n`;
        message += `   💵 Доход: ${formatNumber(asset.cashFlow || 0)} ₽/мес\n\n`;

        // Добавить кнопку продажи
        keyboard.inline_keyboard.push([{
          text: `💸 Продать "${asset.title}" за ${formatNumber(sellPrice)} ₽`,
          callback_data: `sell_market_asset_${index}`
        }]);
      });

      message += `💰 Баланс: ${formatNumber(player.cash)} ₽\n`;
      message += `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/мес\n`;
      message += `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/мес\n`;
      message += `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес\n\n`;
      message += `Что вы хотите сделать?`;
    } else {
      // Нет подходящих активов для продажи
      message += `У вас нет подходящих активов для продажи.\n\n`;
      message += `💰 Баланс: ${formatNumber(player.cash)} ₽\n\n`;
      message += `Что вы хотите сделать?`;
    }

    // Всегда добавить кнопку "Пропустить"
    keyboard.inline_keyboard.push([{
      text: 'Пропустить',
      callback_data: 'skip_market'
    }]);

    await this.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  /**
   * Генерирует клавиатуру для market карточки
   * @param {Object} marketCard - Market карточка
   * @param {Object} player - Объект игрока
   * @returns {Object} Клавиатура
   */
  generateMarketKeyboard(marketCard, player) {
    const keyboard = {
      inline_keyboard: []
    };

    // Найти подходящие активы игрока
    const relatedDeals = marketCard.relatedDeals || [];
    const eligibleAssets = player.assets ? player.assets.filter(asset =>
      relatedDeals.includes(asset.id || asset.title)
    ) : [];

    // Кнопки продажи для подходящих активов (только если карта не имеет passiveIncome)
    if (!marketCard.passiveIncome && eligibleAssets.length > 0) {
      eligibleAssets.forEach((asset, index) => {
        const sellPrice = calculateMarketSellPrice(marketCard, asset);
        keyboard.inline_keyboard.push([{
          text: `💸 Продать "${asset.title}" за ${formatNumber(sellPrice)} ₽`,
          callback_data: `sell_market_asset_${index}`
        }]);
      });
    }

    // Всегда добавить кнопку "Пропустить"
    keyboard.inline_keyboard.push([{
      text: 'Пропустить',
      callback_data: 'skip_market'
    }]);

    return keyboard;
  }
}

/**
 * Рассчитывает цену продажи актива по market карточке
 * @param {Object} marketCard - Market карточка
 * @param {Object} asset - Актив для продажи
 * @returns {number} Цена продажи
 */
function calculateMarketSellPrice(marketCard, asset) {
  if (marketCard.cost) {
    return marketCard.cost;
  }

  if (marketCard.apartmentCost) {
    // Для многоквартирных домов - цена за квартиру × количество квартир
    const apartments = asset.apartments || 1;
    return apartments * marketCard.apartmentCost;
  }

  if (marketCard.costMultiple) {
    // Для партнерств - оригинальная стоимость × множитель
    return asset.cost * marketCard.costMultiple;
  }

  return 0;
}

module.exports = MessageService;
