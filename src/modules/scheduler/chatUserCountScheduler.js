/**
 * Модуль для планирования задачи обновления количества пользователей в чатах
 */

const Scheduler = require('../../helpers/scheduler');
const { processChats } = require('../chatUserStorage/processChats');

class ChatUserCountScheduler {
  constructor() {
    this.scheduler = new Scheduler();
    this.databaseService = null;
    this.bot = null;
  }

  /**
   * Инициализация планировщика
   * @param {Object} bot - Экземпляр Telegram бота
   * @param {Object} databaseService - Экземпляр DatabaseService
   */
  init(bot, databaseService) {
    this.bot = bot;
    this.databaseService = databaseService;
    
    // Добавляем задачу в планировщик
    this.scheduler.addTask(
      'updateChatUserCounts',
      '* * * * *', // Каждый день в 04:00
      this.updateChatUserCounts.bind(this),
      {
        timezone: 'Europe/Samara'
      }
    );
    
    console.log('[ChatUserCountScheduler] Scheduler initialized with daily task at 04:00');
  }

  /**
   * Функция для обновления количества пользователей в чатах
   */
  async updateChatUserCounts() {
    console.log('[ChatUserCountScheduler] Starting daily chat user count update...');
    
    try {
      if (!this.bot || !this.databaseService) {
        throw new Error('Scheduler not properly initialized. Bot or DatabaseService is missing.');
      }
      
      // Вызываем функцию обработки чатов
      await processChats(this.bot, this.databaseService);
      
      console.log('[ChatUserCountScheduler] Daily chat user count update completed successfully');
      
    } catch (error) {
      console.error('[ChatUserCountScheduler] Error during daily chat user count update:', error);
      throw error;
    }
  }

  /**
   * Запускает планировщик
   */
  start() {
    if (!this.bot || !this.databaseService) {
      console.error('[ChatUserCountScheduler] Cannot start scheduler: not properly initialized');
      return false;
    }
    
    this.scheduler.start();
    console.log('[ChatUserCountScheduler] Scheduler started');
    return true;
  }

  /**
   * Останавливает планировщик
   */
  stop() {
    this.scheduler.stop();
    console.log('[ChatUserCountScheduler] Scheduler stopped');
  }

  /**
   * Получает список задач
   * @returns {Array}
   */
  getTasks() {
    return this.scheduler.getTasks();
  }

  /**
   * Проверяет, запущен ли планировщик
   * @returns {boolean}
   */
  isRunning() {
    return this.scheduler.isSchedulerRunning();
  }
}

module.exports = ChatUserCountScheduler;
