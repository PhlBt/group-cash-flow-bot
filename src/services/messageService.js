const { welcomeKeyboard } = require('../keyboards');

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
   * Отправляет общее сообщение об ошибке
   * @param {number} chatId - ID чата
   * @param {string} errorText - Текст ошибки
   */
  async sendErrorMessage(chatId, errorText) {
    await this.bot.sendMessage(chatId, errorText);
  }
}

module.exports = MessageService;
