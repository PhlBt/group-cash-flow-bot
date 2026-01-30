/**
 * Универсальный модуль планировщика задач
 * Использует node-cron для выполнения задач по расписанию
 */

const cron = require('node-cron');

class Scheduler {
  constructor() {
    this.tasks = new Map();
    this.isRunning = false;
  }

  /**
   * Добавляет задачу в планировщик
   * @param {string} name - Название задачи
   * @param {string} cronExpression - Cron выражение (например, '0 4 * * *')
   * @param {Function} taskFunction - Функция, которую нужно выполнить
   * @param {Object} options - Дополнительные опции
   */
  addTask(name, cronExpression, taskFunction, options = {}) {
    if (this.tasks.has(name)) {
      console.warn(`Task '${name}' already exists. Skipping...`);
      return;
    }

    const task = cron.schedule(cronExpression, async () => {
      console.log(`[Scheduler] Running task: ${name} at ${new Date().toISOString()}`);
      
      try {
        await taskFunction();
        console.log(`[Scheduler] Task '${name}' completed successfully`);
      } catch (error) {
        console.error(`[Scheduler] Task '${name}' failed:`, error);
      }
    }, {
      scheduled: this.isRunning,
      timezone: options.timezone || 'Europe/Samara'
    });

    this.tasks.set(name, {
      task,
      cronExpression,
      taskFunction,
      options
    });

    console.log(`[Scheduler] Task '${name}' added with cron expression: ${cronExpression}`);
  }

  /**
   * Запускает все задачи
   */
  start() {
    if (this.isRunning) {
      console.log('[Scheduler] Scheduler is already running');
      return;
    }

    this.isRunning = true;
    
    for (const [name, taskInfo] of this.tasks.entries()) {
      taskInfo.task.start();
      console.log(`[Scheduler] Task '${name}' started`);
    }

    console.log('[Scheduler] All tasks started');
  }

  /**
   * Останавливает все задачи
   */
  stop() {
    if (!this.isRunning) {
      console.log('[Scheduler] Scheduler is already stopped');
      return;
    }

    this.isRunning = false;
    
    for (const [name, taskInfo] of this.tasks.entries()) {
      taskInfo.task.stop();
      console.log(`[Scheduler] Task '${name}' stopped`);
    }

    console.log('[Scheduler] All tasks stopped');
  }

  /**
   * Удаляет задачу из планировщика
   * @param {string} name - Название задачи
   */
  removeTask(name) {
    const taskInfo = this.tasks.get(name);
    if (taskInfo) {
      taskInfo.task.stop();
      this.tasks.delete(name);
      console.log(`[Scheduler] Task '${name}' removed`);
    } else {
      console.warn(`[Scheduler] Task '${name}' not found`);
    }
  }

  /**
   * Получает список всех задач
   * @returns {Array} Список задач
   */
  getTasks() {
    return Array.from(this.tasks.entries()).map(([name, taskInfo]) => ({
      name,
      cronExpression: taskInfo.cronExpression,
      isRunning: this.isRunning
    }));
  }

  /**
   * Проверяет, запущен ли планировщик
   * @returns {boolean}
   */
  isSchedulerRunning() {
    return this.isRunning;
  }
}

module.exports = Scheduler;
