/**
 * Менеджер состояний для обработки сообщений об ошибках
 * Отслеживает пользователей, ожидающих ввода описания ошибки
 */
class ErrorStateManager {
  constructor() {
    this.waitingUsers = new Map(); // userId -> { timeoutId, messageId, chatId }
  }

  /**
   * Устанавливает состояние ожидания для пользователя
   * @param {string} userId - ID пользователя
   * @param {number} messageId - ID сообщения для ответа
   * @param {number} chatId - ID чата
   */
  setWaiting(userId, messageId, chatId) {
    // Сбрасываем предыдущий таймер, если есть
    this.clearWaiting(userId);
    
    // Устанавливаем таймер на 5 минут
    const timeoutId = setTimeout(() => {
      this.clearWaiting(userId);
      // Таймаут истек - уведомим пользователя (если bot доступен)
      // bot будет передан через setBotInstance при инициализации
      if (this.bot) {
        this.bot.sendMessage(chatId, '⏰ Время ожидания ответа истекло. Если хотите сообщить об ошибке, нажмите кнопку "Сообщить об ошибке" снова.');
      }
    }, 5 * 60 * 1000); // 5 минут

    this.waitingUsers.set(userId, { timeoutId, messageId, chatId });
  }

  /**
   * Обновляет messageId для пользователя (используется после отправки запроса на описание ошибки)
   * @param {string} userId - ID пользователя
   * @param {number} newMessageId - Новый ID сообщения для ответа
   */
  updateMessageId(userId, newMessageId) {
    const state = this.waitingUsers.get(userId);
    if (state) {
      state.messageId = newMessageId;
    }
  }

  /**
   * Проверяет, ожидает ли пользователь ввода ошибки
   * @param {string} userId - ID пользователя
   * @returns {boolean} true, если пользователь ожидает ввода
   */
  isWaiting(userId) {
    return this.waitingUsers.has(userId);
  }

  /**
   * Сбрасывает состояние ожидания для пользователя
   * @param {string} userId - ID пользователя
   */
  clearWaiting(userId) {
    const state = this.waitingUsers.get(userId);
    if (state && state.timeoutId) {
      clearTimeout(state.timeoutId);
    }
    this.waitingUsers.delete(userId);
  }

  /**
   * Получает состояние ожидания пользователя
   * @param {string} userId - ID пользователя
   * @returns {Object|null} состояние пользователя или null
   */
  getWaitingState(userId) {
    return this.waitingUsers.get(userId) || null;
  }

  /**
   * Устанавливает экземпляр бота для отправки сообщений
   * @param {Object} bot - Экземпляр Telegram бота
   */
  setBotInstance(bot) {
    this.bot = bot;
  }

  /**
   * Отменяет ожидание и отправляет уведомление
   * @param {string} userId - ID пользователя
   * @param {number} chatId - ID чата
   */
  cancelWaiting(userId, chatId) {
    if (this.isWaiting(userId)) {
      this.clearWaiting(userId);
      if (this.bot) {
        this.bot.sendMessage(chatId, '❌ Ожидание описания ошибки отменено.');
      }
    }
  }
}

// Экспортируем единственный экземпляр
module.exports = new ErrorStateManager();
