/**
 * Универсальный модуль для хранения данных пользователей и чатов
 * Может использоваться в любом Telegram боте
 * Использует существующее подключение к MongoDB через DatabaseService
 */
class ChatUserStorage {
  /**
   * Конструктор модуля
   * @param {Object} databaseService - Экземпляр DatabaseService с подключением к MongoDB
   */
  constructor(databaseService) {
    this.databaseService = databaseService;
    this.chatsCollection = null;
    this.usersCollection = null;
  }

  /**
   * Инициализация коллекций и создание индексов
   * @returns {Promise<void>}
   */
  async init() {
    this.chatsCollection = this.databaseService.getCollection('chats');
    this.usersCollection = this.databaseService.getCollection('users');
    
    // Создаем индексы при первой инициализации
    await this._createChatIndexes();
    await this._createUserIndexes();
  }

  /**
   * Создает индексы для коллекции chats
   * @private
   * @returns {Promise<void>}
   */
  async _createChatIndexes() {
    try {
      // Индекс по id чата
      await this.chatsCollection.createIndex({ id: 1 });
      
      // Индекс для поиска по message_thread_id в forum_topics
      await this.chatsCollection.createIndex({ 'forum_topics.message_thread_id': 1 });
      
      console.log('Chat indexes created successfully');
    } catch (error) {
      console.error('Error creating chat indexes:', error);
    }
  }

  /**
   * Создает индексы для коллекции users
   * @private
   * @returns {Promise<void>}
   */
  async _createUserIndexes() {
    try {
      // Индекс по id пользователя
      await this.usersCollection.createIndex({ id: 1 });
      
      console.log('User indexes created successfully');
    } catch (error) {
      console.error('Error creating user indexes:', error);
    }
  }

  /**
   * Сохраняет данные чата в базу данных
   * @param {Object} msg - Объект сообщения Telegram API
   * @returns {Promise<Object>} Результат операции
   */
  async saveChat(msg) {
    if (!this.chatsCollection) {
      await this.init();
    }

    const chat = msg.chat || msg.message?.chat;
    if (!chat || !chat.id) {
      return { success: false, error: 'Invalid chat data' };
    }

    const chatData = {
      id: chat.id,
      type: chat.type,
      title: chat.title,
      username: chat.username,
      updated_at: new Date(),
      kicked: false
    };

    try {
      // Используем findOneAndUpdate с upsert для атомарной операции
      const updateData = {
        $set: chatData,
        $inc: { counter: 1 }
      };

      // Добавляем пользователя в массив user_ids если его там нет
      if (msg.from && msg.from.id) {
        updateData.$addToSet = { user_ids: msg.from.id };
      }

      // Обработка forum_topics для supergroup
      if (chat.type === 'supergroup' && msg.forum_topic_created) {
        const forumTopicData = {
          message_thread_id: msg.message_thread_id,
          name: msg.forum_topic_created.name,
          icon_color: msg.forum_topic_created.icon_color,
          icon_custom_emoji_id: msg.forum_topic_created.icon_custom_emoji_id
        };
        
        await this._updateForumTopic(chat.id, forumTopicData);
      }

      const result = await this.chatsCollection.findOneAndUpdate(
        { id: chat.id },
        updateData,
        { 
          upsert: true,
          returnDocument: 'after'
        }
      );

      const action = result.lastErrorObject?.upserted ? 'created' : 'updated';
      return { success: true, action, chatId: chat.id };
    } catch (error) {
      console.error('Error saving chat:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Сохраняет данные пользователя в базу данных
   * @param {Object} msg - Объект сообщения Telegram API
   * @returns {Promise<Object>} Результат операции
   */
  async saveUser(msg) {
    if (!this.usersCollection) {
      await this.init();
    }

    const user = msg.from || msg.message?.from;
    if (!user || !user.id) {
      return { success: false, error: 'Invalid user data' };
    }

    const userData = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      language_code: user.language_code,
      is_bot: user.is_bot,
      updated_at: new Date()
    };

    try {
      // Используем findOneAndUpdate с upsert для атомарной операции
      const updateData = {
        $set: userData,
        $inc: { counter: 1 }
      };

      // Добавляем чат в массив chat_ids если его там нет
      if (msg.chat && msg.chat.id) {
        updateData.$addToSet = { chat_ids: msg.chat.id };
      }

      const result = await this.usersCollection.findOneAndUpdate(
        { id: user.id },
        updateData,
        { 
          upsert: true,
          returnDocument: 'after'
        }
      );

      const action = result.lastErrorObject?.upserted ? 'created' : 'updated';
      return { success: true, action, userId: user.id };
    } catch (error) {
      console.error('Error saving user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Комплексное сохранение данных чата и пользователя
   * @param {Object} msg - Объект сообщения Telegram API
   * @returns {Promise<Object>} Результат операции
   */
  async saveChatAndUser(msg) {
    const chatResult = await this.saveChat(msg);
    const userResult = await this.saveUser(msg);

    return {
      success: chatResult.success && userResult.success,
      chat: chatResult,
      user: userResult
    };
  }

  /**
   * Сохраняет данные из callback query
   * @param {Object} query - Объект callback query Telegram API
   * @returns {Promise<Object>} Результат операции
   */
  async saveQueryChatAndUser(query) {
    // Извлекаем данные из query.message
    const msg = query.message;
    if (!msg) {
      return { success: false, error: 'Invalid query message data' };
    }

    msg.from = query.from;

    // Обработка forum_topic_created из reply_to_message
    if (query.message.reply_to_message && query.message.reply_to_message.forum_topic_created) {
      msg.forum_topic_created = query.message.reply_to_message.forum_topic_created;
    }

    return await this.saveChatAndUser(msg);
  }

  /**
   * Обновляет или добавляет forum topic в чате
   * @private
   * @param {number} chatId - ID чата
   * @param {Object} forumTopicData - Данные forum topic
   * @returns {Promise<void>}
   */
  async _updateForumTopic(chatId, forumTopicData) {
    try {
      // Проверяем существование forum topic с таким message_thread_id
      const existingChat = await this.chatsCollection.findOne({
        id: chatId,
        'forum_topics.message_thread_id': forumTopicData.message_thread_id
      });

      if (existingChat) {
        // Увеличиваем счетчик существующего forum topic
        await this.chatsCollection.updateOne(
          { id: chatId, 'forum_topics.message_thread_id': forumTopicData.message_thread_id },
          { $inc: { 'forum_topics.$.counter': 1 } }
        );
      } else {
        // Добавляем новый forum topic с counter: 1
        const newForumTopic = {
          ...forumTopicData,
          counter: 1
        };
        
        await this.chatsCollection.updateOne(
          { id: chatId },
          { $push: { forum_topics: newForumTopic } }
        );
      }
    } catch (error) {
      console.error('Error updating forum topic:', error);
    }
  }

  /**
   * Получает данные чата из базы
   * @param {number} chatId - ID чата
   * @returns {Promise<Object|null>} Данные чата или null
   */
  async getChat(chatId) {
    if (!this.chatsCollection) {
      await this.init();
    }
    return await this.chatsCollection.findOne({ id: chatId });
  }

  /**
   * Получает данные пользователя из базы
   * @param {number} userId - ID пользователя
   * @returns {Promise<Object|null>} Данные пользователя или null
   */
  async getUser(userId) {
    if (!this.usersCollection) {
      await this.init();
    }
    return await this.usersCollection.findOne({ id: userId });
  }

  /**
   * Увеличивает счетчик вызовов для чата
   * @param {number} chatId - ID чата
   * @returns {Promise<Object>} Результат операции
   */
  async incrementChatCounter(chatId) {
    if (!this.chatsCollection) {
      await this.init();
    }

    try {
      const result = await this.chatsCollection.updateOne(
        { id: chatId },
        { $inc: { counter: 1 }, $set: { updated_at: new Date() } }
      );
      
      return {
        success: result.modifiedCount > 0,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      console.error('Error incrementing chat counter:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Увеличивает счетчик вызовов для пользователя
   * @param {number} userId - ID пользователя
   * @returns {Promise<Object>} Результат операции
   */
  async incrementUserCounter(userId) {
    if (!this.usersCollection) {
      await this.init();
    }

    try {
      const result = await this.usersCollection.updateOne(
        { id: userId },
        { $inc: { counter: 1 }, $set: { updated_at: new Date() } }
      );
      
      return {
        success: result.modifiedCount > 0,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      console.error('Error incrementing user counter:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Получает статистику по чатам
   * @returns {Promise<Object>} Статистика
   */
  async getChatsStats() {
    if (!this.chatsCollection) {
      await this.init();
    }

    try {
      const totalChats = await this.chatsCollection.countDocuments();
      const totalCounter = await this.chatsCollection.aggregate([
        { $group: { _id: null, total: { $sum: '$counter' } } }
      ]).toArray();

      return {
        totalChats,
        totalCounter: totalCounter[0]?.total || 0
      };
    } catch (error) {
      console.error('Error getting chats stats:', error);
      return { totalChats: 0, totalCounter: 0 };
    }
  }

  /**
   * Получает статистику по пользователям
   * @returns {Promise<Object>} Статистика
   */
  async getUsersStats() {
    if (!this.usersCollection) {
      await this.init();
    }

    try {
      const totalUsers = await this.usersCollection.countDocuments();
      const totalCounter = await this.usersCollection.aggregate([
        { $group: { _id: null, total: { $sum: '$counter' } } }
      ]).toArray();

      return {
        totalUsers,
        totalCounter: totalCounter[0]?.total || 0
      };
    } catch (error) {
      console.error('Error getting users stats:', error);
      return { totalUsers: 0, totalCounter: 0 };
    }
  }

  /**
   * Получает список администраторов чата с кэшированием
   * @param {number} chatId - ID чата
   * @param {Object} bot - Экземпляр Telegram бота
   * @returns {Promise<Array>} Массив администраторов
   */
  async getChatAdmins(chatId, bot) {
    if (!this.chatsCollection) {
      await this.init();
    }

    try {
      const chat = await this.chatsCollection.findOne({ id: chatId });
      const now = new Date();
      const cacheTimeout = 10 * 60 * 1000; // 10 минут в миллисекундах

      // Проверяем, есть ли кэш и не истек ли он
      if (chat && chat.admins && chat.admins_cache_expires_at && now < chat.admins_cache_expires_at) {
        return chat.admins;
      }

      // Получаем администраторов из Telegram API
      const admins = await bot.getChatAdministrators(chatId);
      
      // Форматируем данные администраторов
      const formattedAdmins = admins.map(admin => ({
        id: admin.user.id,
        first_name: admin.user.first_name,
        last_name: admin.user.last_name || '',
        username: admin.user.username || ''
      }));

      // Обновляем кэш в базе данных
      const cacheExpiresAt = new Date(now.getTime() + cacheTimeout);
      
      await this.chatsCollection.updateOne(
        { id: chatId },
        {
          $set: {
            admins: formattedAdmins,
            admins_cache_expires_at: cacheExpiresAt
          }
        },
        { upsert: true }
      );

      return formattedAdmins;
    } catch (error) {
      console.error('Error getting chat admins:', error);
      return [];
    }
  }

  /**
   * Проверяет, является ли пользователь администратором чата
   * @param {number} chatId - ID чата
   * @param {number} userId - ID пользователя
   * @param {Object} bot - Экземпляр Telegram бота
   * @returns {Promise<boolean>} true если пользователь администратор
   */
  async isUserAdmin(chatId, userId, bot) {
    const admins = await this.getChatAdmins(chatId, bot);
    return admins.some(admin => admin.id === userId);
  }

  /**
   * Обновляет кэш администраторов (принудительно)
   * @param {number} chatId - ID чата
   * @param {Object} bot - Экземпляр Telegram бота
   * @returns {Promise<Array>} Массив администраторов
   */
  async updateChatAdmins(chatId, bot) {
    if (!this.chatsCollection) {
      await this.init();
    }

    try {
      // Получаем администраторов из Telegram API
      const admins = await bot.getChatAdministrators(chatId);
      
      // Форматируем данные администраторов
      const formattedAdmins = admins.map(admin => ({
        id: admin.user.id,
        first_name: admin.user.first_name,
        last_name: admin.user.last_name || '',
        username: admin.user.username || ''
      }));

      // Обновляем кэш в базе данных
      const now = new Date();
      const cacheTimeout = 10 * 60 * 1000; // 10 минут в миллисекундах
      const cacheExpiresAt = new Date(now.getTime() + cacheTimeout);
      
      await this.chatsCollection.updateOne(
        { id: chatId },
        {
          $set: {
            admins: formattedAdmins,
            admins_cache_expires_at: cacheExpiresAt
          }
        },
        { upsert: true }
      );

      return formattedAdmins;
    } catch (error) {
      console.error('Error updating chat admins:', error);
      return [];
    }
  }
}

module.exports = ChatUserStorage;
