const Bottleneck = require('bottleneck');

/**
 * RateLimiter для соблюдения ограничений Telegram API
 * Глобальный лимит: 30 сообщений в секунду
 * Лимит на чат: 20 сообщений в минуту
 */
class RateLimiter {
  constructor() {
    // Глобальная очередь: 30 сообщений в секунду
    this.globalLimiter = new Bottleneck({
      reservoir: 30, // количество доступных запросов
      reservoirRefreshAmount: 30,
      reservoirRefreshInterval: 1000, // 1 секунда
      maxConcurrent: 1, // последовательная обработка
      minTime: 0
    });

    // Карта лимитеров для каждого чата: 20 сообщений в минуту
    // chatId -> { limiter: Bottleneck, lastUsed: timestamp }
    this.chatLimiters = new Map();

    // Очистка неиспользуемых лимитеров чатов каждые 5 минут
    this.cleanupInterval = setInterval(() => {
      this.cleanupUnusedLimiters();
    }, 5 * 60 * 1000);
  }

  /**
   * Получить или создать лимитер для конкретного чата
   * @param {number|string} chatId - ID чата
   * @returns {Bottleneck} Лимитер для чата
   */
  getChatLimiter(chatId) {
    if (!this.chatLimiters.has(chatId)) {
      this.chatLimiters.set(chatId, {
        limiter: new Bottleneck({
          reservoir: 20, // 20 сообщений
          reservoirRefreshAmount: 20,
          reservoirRefreshInterval: 60 * 1000, // 1 минута
          maxConcurrent: 1,
          minTime: 0
        }),
        lastUsed: Date.now()
      });
    }
    return this.chatLimiters.get(chatId).limiter;
  }

  /**
   * Запланировать операцию с соблюдением rate limits
   * @param {number|string} chatId - ID чата
   * @param {Function} operation - Асинхронная функция для выполнения
   * @returns {Promise} Результат операции
   */
  async schedule(chatId, operation) {
    // Сначала применить глобальный лимит
    return this.globalLimiter.schedule(async () => {
      // Затем лимит для конкретного чата
      const chatLimiter = this.getChatLimiter(chatId);
      // Обновить время использования
      this.chatLimiters.get(chatId).lastUsed = Date.now();
      return chatLimiter.schedule(operation);
    });
  }

  /**
   * Очистить неиспользуемые лимитеры чатов
   * Удаляет лимитеры, которые не использовались более 10 минут
   */
  cleanupUnusedLimiters() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 минут

    for (const [chatId, entry] of this.chatLimiters.entries()) {
      if (now - entry.lastUsed > maxAge) {
        entry.limiter.stop();
        this.chatLimiters.delete(chatId);
      }
    }
  }

  /**
   * Остановить rate limiter и очистить интервалы
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Остановить все лимитеры
    this.globalLimiter.stop();
    for (const entry of this.chatLimiters.values()) {
      entry.limiter.stop();
    }
    this.chatLimiters.clear();
  }

  /**
   * Получить статистику использования
   * @returns {Object} Статистика
   */
  getStats() {
    return {
      globalQueued: this.globalLimiter.queued(),
      globalRunning: this.globalLimiter.running(),
      chatLimitersCount: this.chatLimiters.size,
      chatLimitersDetails: Array.from(this.chatLimiters.entries()).map(([chatId, entry]) => ({
        chatId,
        queued: entry.limiter.queued(),
        running: entry.limiter.running(),
        lastUsed: new Date(entry.lastUsed).toISOString()
      }))
    };
  }
}

module.exports = RateLimiter;
