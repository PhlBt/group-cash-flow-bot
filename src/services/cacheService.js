/**
 * Сервис кэширования
 * Кэширует часто используемые данные для улучшения производительности
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5 минут по умолчанию
  }

  /**
   * Получить значение из кэша
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Установить значение в кэш
   */
  set(key, value, ttl = this.ttl) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  /**
   * Удалить значение из кэша
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Очистить весь кэш
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Получить или установить значение (паттерн cache-aside)
   */
  async getOrSet(key, fetcher, ttl = this.ttl) {
    let value = this.get(key);
    if (value !== null) return value;

    value = await fetcher();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Кэширование статистики игрока
   */
  async getPlayerStats(gameManager, userId, ttl = 2 * 60 * 1000) { // 2 минуты
    const key = `player_stats_${userId}`;
    return this.getOrSet(key, () => gameManager.getPlayerStats(userId), ttl);
  }

  /**
   * Кэширование топа игроков
   */
  async getTopPlayers(gameManager, sortBy, limit = 10, ttl = 5 * 60 * 1000) { // 5 минут
    const key = `top_players_${sortBy}_${limit}`;
    return this.getOrSet(key, () => gameManager.getTopPlayers(sortBy, limit), ttl);
  }

  /**
   * Кэширование игры
   */
  async getGame(gameManager, chatId, ttl = 30 * 1000) { // 30 секунд
    const key = `game_${chatId}`;
    return this.getOrSet(key, () => gameManager.getGame(chatId), ttl);
  }

  /**
   * Инвалидация кэша при изменении данных
   */
  invalidateGame(chatId) {
    this.delete(`game_${chatId}`);
  }

  invalidatePlayerStats(userId) {
    this.delete(`player_stats_${userId}`);
  }

  invalidateTopPlayers() {
    // Удаляем все ключи с топами игроков
    for (const key of this.cache.keys()) {
      if (key.startsWith('top_players_')) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Получить статистику кэша
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const item of this.cache.values()) {
      if (now > item.expiry) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      hitRate: 'Недоступно (нужен мониторинг)'
    };
  }

  /**
   * Очистка просроченных записей
   */
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Запуск автоматической очистки
   */
  startCleanup(interval = 60 * 1000) { // Каждую минуту
    setInterval(() => {
      this.cleanup();
    }, interval);
  }
}

module.exports = CacheService;
