/**
 * Сервис для управления ограничениями тем (thread) в супергруппах
 * Позволяет администраторам ограничивать выполнение команд бота определенными темами
 * Поддерживает как темы (threadId), так и основной чат (threadId === null)
 */
class ThreadRestrictionService {
  /**
   * Константа для обозначения основного чата в базе данных
   * @type {number}
   */
  static MAIN_CHAT_THREAD_ID = 0;

  /**
   * Преобразует threadId для хранения в базе данных
   * @param {number|null} threadId - ID темы (null для основного чата)
   * @returns {number} ID для хранения в базе данных
   * @private
   */
  _normalizeThreadId(threadId) {
    return threadId === null ? ThreadRestrictionService.MAIN_CHAT_THREAD_ID : threadId;
  }

  /**
   * Преобразует threadId из базы данных в формат приложения
   * @param {number} storedThreadId - ID темы из базы данных
   * @returns {number|null} ID темы (null для основного чата)
   * @private
   */
  _restoreThreadId(storedThreadId) {
    return storedThreadId === ThreadRestrictionService.MAIN_CHAT_THREAD_ID ? null : storedThreadId;
  }

  /**
   * Конструктор сервиса
   * @param {Object} databaseService - Экземпляр DatabaseService с подключением к MongoDB
   */
  constructor(databaseService) {
    this.databaseService = databaseService;
    this.threadRestrictionsCollection = null;
  }

  /**
   * Инициализация коллекции thread_restrictions
   * @returns {Promise<void>}
   */
  async init() {
    this.threadRestrictionsCollection = this.databaseService.getCollection('thread_restrictions');
    
    // Создаем индексы при первой инициализации
    await this._createIndexes();
  }

  /**
   * Создает индексы для коллекции thread_restrictions
   * @private
   * @returns {Promise<void>}
   */
  async _createIndexes() {
    try {
      // Индекс по chatId для быстрого поиска ограничений по чату
      await this.threadRestrictionsCollection.createIndex({ chatId: 1 });
      
      console.log('Thread restrictions indexes created successfully');
    } catch (error) {
      console.error('Error creating thread restrictions indexes:', error);
    }
  }

  /**
   * Получает ограничения для чата
   * @param {number} chatId - ID чата
   * @returns {Promise<Object|null>} Документ с ограничениями или null
   */
  async getThreadRestrictions(chatId) {
    if (!this.threadRestrictionsCollection) {
      await this.init();
    }

    return await this.threadRestrictionsCollection.findOne({ chatId });
  }

  /**
   * Добавляет тему к ограничениям чата
   * @param {number} chatId - ID чата
   * @param {number|null} threadId - ID темы (null для основного чата)
   * @returns {Promise<{success: boolean, error?: string, message?: string}>} Результат операции
   */
  async addThreadRestriction(chatId, threadId) {
    if (!this.threadRestrictionsCollection) {
      await this.init();
    }

    try {
      const normalizedThreadId = this._normalizeThreadId(threadId);
      const restrictions = await this.getThreadRestrictions(chatId);
      const now = new Date();

      if (!restrictions) {
        // Создаем новые ограничения
        await this.threadRestrictionsCollection.insertOne({
          chatId,
          restricted: true,
          activeThreads: [normalizedThreadId],
          createdAt: now,
          updatedAt: now
        });

        const message = threadId === null 
          ? '✅ Основной чат открыт для команд бота'
          : '✅ Тема открыта для команд бота';

        return {
          success: true,
          message
        };
      } else {
        // Проверяем, есть ли уже эта тема в ограничениях
        if (restrictions.activeThreads.includes(normalizedThreadId)) {
          const message = threadId === null 
            ? '✅ Основной чат уже открыт для команд бота'
            : '✅ Тема уже открыта для команд бота';

          return {
            success: true,
            message
          };
        }

        // Добавляем тему к существующим ограничениям
        await this.threadRestrictionsCollection.updateOne(
          { chatId },
          {
            $addToSet: { activeThreads: normalizedThreadId },
            $set: { updatedAt: now }
          }
        );

        const message = threadId === null 
          ? '✅ Основной чат открыт для команд бота'
          : '✅ Тема открыта для команд бота';

        return {
          success: true,
          message
        };
      }
    } catch (error) {
      console.error('Error adding thread restriction:', error);
      return {
        success: false,
        error: 'Ошибка при открытии темы'
      };
    }
  }

  /**
   * Удаляет тему из ограничений чата
   * @param {number} chatId - ID чата
   * @param {number|null} threadId - ID темы (null для основного чата)
   * @returns {Promise<{success: boolean, error?: string, message?: string}>} Результат операции
   */
  async removeThreadRestriction(chatId, threadId) {
    if (!this.threadRestrictionsCollection) {
      await this.init();
    }

    try {
      const normalizedThreadId = this._normalizeThreadId(threadId);
      const restrictions = await this.getThreadRestrictions(chatId);

      if (!restrictions) {
        const message = threadId === null 
          ? '❌ Основной чат не ограничен'
          : '❌ Тема не ограничена';

        return {
          success: true,
          message
        };
      }

      // Проверяем, есть ли эта тема в ограничениях
      if (!restrictions.activeThreads.includes(normalizedThreadId)) {
        const message = threadId === null 
          ? '❌ Основной чат не ограничен'
          : '❌ Тема не ограничена';

        return {
          success: true,
          message
        };
      }

      // Удаляем тему из ограничений
      const newActiveThreads = restrictions.activeThreads.filter(id => id !== normalizedThreadId);
      const now = new Date();

      if (newActiveThreads.length === 0) {
        // Если нет активных тем, удаляем всю запись ограничений
        await this.threadRestrictionsCollection.deleteOne({ chatId });
        
        const message = threadId === null 
          ? '✅ Основной чат закрыт для команд бота. Все темы закрыты.'
          : '✅ Тема закрыта для команд бота. Все темы закрыты.';

        return {
          success: true,
          message
        };
      } else {
        // Обновляем список активных тем
        await this.threadRestrictionsCollection.updateOne(
          { chatId },
          {
            $set: {
              activeThreads: newActiveThreads,
              updatedAt: now
            }
          }
        );

        const message = threadId === null 
          ? '✅ Основной чат закрыт для команд бота'
          : '✅ Тема закрыта для команд бота';

        return {
          success: true,
          message
        };
      }
    } catch (error) {
      console.error('Error removing thread restriction:', error);
      return {
        success: false,
        error: 'Ошибка при закрытии темы'
      };
    }
  }

  /**
   * Проверяет, разрешена ли команда в данной теме
   * @param {number} chatId - ID чата
   * @param {number|null} threadId - ID темы (null для основного чата)
   * @returns {Promise<boolean>} true если команда разрешена, false если ограничена
   */
  async isThreadRestricted(chatId, threadId) {
    if (!this.threadRestrictionsCollection) {
      await this.init();
    }

    try {
      const restrictions = await this.getThreadRestrictions(chatId);

      // Если нет ограничений, команда разрешена
      if (!restrictions) {
        return true;
      }

      // Преобразуем threadId для проверки в базе данных
      const normalizedThreadId = this._normalizeThreadId(threadId);

      // Проверяем, есть ли эта тема в списке разрешенных
      return restrictions.activeThreads.includes(normalizedThreadId);
    } catch (error) {
      console.error('Error checking thread restriction:', error);
      return true; // В случае ошибки разрешаем команду
    }
  }

  /**
   * Получает список активных тем для чата
   * @param {number} chatId - ID чата
   * @returns {Promise<Array>} Массив ID активных тем
   */
  async getActiveThreads(chatId) {
    if (!this.threadRestrictionsCollection) {
      await this.init();
    }

    try {
      const restrictions = await this.getThreadRestrictions(chatId);
      return restrictions ? restrictions.activeThreads : [];
    } catch (error) {
      console.error('Error getting active threads:', error);
      return [];
    }
  }

  /**
   * Получает список активных тем для чата с преобразованием threadId
   * @param {number} chatId - ID чата
   * @returns {Promise<Array>} Массив ID активных тем (null для основного чата)
   */
  async getActiveThreadsFormatted(chatId) {
    if (!this.threadRestrictionsCollection) {
      await this.init();
    }

    try {
      const restrictions = await this.getThreadRestrictions(chatId);
      if (!restrictions) {
        return [];
      }

      return restrictions.activeThreads.map(threadId => this._restoreThreadId(threadId));
    } catch (error) {
      console.error('Error getting active threads formatted:', error);
      return [];
    }
  }

  /**
   * Удаляет все ограничения для чата
   * @param {number} chatId - ID чата
   * @returns {Promise<{success: boolean, error?: string}>} Результат операции
   */
  async clearAllRestrictions(chatId) {
    if (!this.threadRestrictionsCollection) {
      await this.init();
    }

    try {
      await this.threadRestrictionsCollection.deleteOne({ chatId });
      return { success: true };
    } catch (error) {
      console.error('Error clearing thread restrictions:', error);
      return {
        success: false,
        error: 'Ошибка при удалении ограничений'
      };
    }
  }

  /**
   * Проверяет, есть ли ограничения для чата
   * @param {number} chatId - ID чата
   * @returns {Promise<boolean>} true если есть ограничения, false если нет
   */
  async hasRestrictions(chatId) {
    if (!this.threadRestrictionsCollection) {
      await this.init();
    }

    try {
      const restrictions = await this.getThreadRestrictions(chatId);
      return !!restrictions;
    } catch (error) {
      console.error('Error checking if chat has restrictions:', error);
      return false;
    }
  }
}

module.exports = ThreadRestrictionService;
