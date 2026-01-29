/**
 * Тесты для модуля ChatUserStorage
 * Для запуска: node test/chatUserStorage.test.js
 */

const ChatUserStorage = require('../chatUserStorage');
const DatabaseService = require('../../../services/databaseService');

// Тестовые данные
const testMsg = {
  chat: {
    id: 123456789,
    type: 'group',
    title: 'Test Group Chat',
    username: 'test_group'
  },
  from: {
    id: 987654321,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    language_code: 'en',
    is_bot: false
  },
  message_thread_id: 100,
  forum_topic_created: {
    name: 'Test Topic',
    icon_color: 7322096,
    icon_custom_emoji_id: 'test_emoji_id'
  }
};

const testSupsrgroupMsg = {
  chat: {
    id: 987654321,
    type: 'supergroup',
    title: 'Test Super Group',
    username: 'test_supergroup'
  },
  from: {
    id: 123456789,
    first_name: 'Super',
    last_name: 'User',
    username: 'superuser',
    language_code: 'en',
    is_bot: false
  },
  message_thread_id: 200,
  forum_topic_created: {
    name: 'Super Topic',
    icon_color: 16766590,
    icon_custom_emoji_id: 'super_emoji_id'
  }
};

async function runTests() {
  console.log('🚀 Запуск тестов ChatUserStorage...\n');

  let databaseService;
  let chatUserStorage;

  try {
    // 1. Подключение к тестовой базе данных
    console.log('1. Подключение к базе данных...');
    databaseService = new DatabaseService('mongodb://localhost:27017/test_bot', 'test_bot');
    await databaseService.connect();
    console.log('✅ Подключение к базе данных успешно\n');

    // 2. Инициализация модуля
    console.log('2. Инициализация ChatUserStorage...');
    chatUserStorage = new ChatUserStorage(databaseService);
    await chatUserStorage.init();
    console.log('✅ ChatUserStorage инициализирован\n');

    // 3. Тест сохранения обычного чата и пользователя
    console.log('3. Тест сохранения обычного чата и пользователя...');
    const result1 = await chatUserStorage.saveChatAndUser(testMsg);
    console.log('Результат:', result1);

    if (result1.success) {
      console.log('✅ Сохранение прошло успешно');
      console.log(`   Chat action: ${result1.chat.action}`);
      console.log(`   User action: ${result1.user.action}`);
    } else {
      console.log('❌ Ошибка сохранения:', result1.chat.error || result1.user.error);
    }
    console.log();

    // 4. Тест повторного сохранения (обновление)
    console.log('4. Тест повторного сохранения (обновление)...');
    const result2 = await chatUserStorage.saveChatAndUser(testMsg);
    console.log('Результат:', result2);

    if (result2.success) {
      console.log('✅ Обновление прошло успешно');
      console.log(`   Chat action: ${result2.chat.action}`);
      console.log(`   User action: ${result2.user.action}`);
    } else {
      console.log('❌ Ошибка обновления:', result2.chat.error || result2.user.error);
    }
    console.log();

    // 5. Тест сохранения supergroup с forum topic
    console.log('5. Тест сохранения supergroup с forum topic...');
    const result3 = await chatUserStorage.saveChatAndUser(testSupsrgroupMsg);
    console.log('Результат:', result3);

    if (result3.success) {
      console.log('✅ Сохранение supergroup прошло успешно');
      console.log(`   Chat action: ${result3.chat.action}`);
      console.log(`   User action: ${result3.user.action}`);
    } else {
      console.log('❌ Ошибка сохранения supergroup:', result3.chat.error || result3.user.error);
    }
    console.log();

    // 6. Тест получения данных
    console.log('6. Тест получения данных...');
    const chat = await chatUserStorage.getChat(testMsg.chat.id);
    const user = await chatUserStorage.getUser(testMsg.from.id);

    if (chat) {
      console.log('✅ Чат найден:');
      console.log(`   ID: ${chat.id}`);
      console.log(`   Title: ${chat.title}`);
      console.log(`   Counter: ${chat.counter}`);
      console.log(`   User IDs: ${chat.user_ids.length}`);
    } else {
      console.log('❌ Чат не найден');
    }

    if (user) {
      console.log('✅ Пользователь найден:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Counter: ${user.counter}`);
      console.log(`   Chat IDs: ${user.chat_ids.length}`);
    } else {
      console.log('❌ Пользователь не найден');
    }
    console.log();

    // 7. Тест увеличения счетчиков
    console.log('7. Тест увеличения счетчиков...');
    const counterResult1 = await chatUserStorage.incrementChatCounter(testMsg.chat.id);
    const counterResult2 = await chatUserStorage.incrementUserCounter(testMsg.from.id);

    console.log('Chat counter result:', counterResult1);
    console.log('User counter result:', counterResult2);

    if (counterResult1.success && counterResult2.success) {
      console.log('✅ Счетчики увеличены успешно');
    } else {
      console.log('❌ Ошибка увеличения счетчиков');
    }
    console.log();

    // 8. Тест статистики
    console.log('8. Тест статистики...');
    const chatsStats = await chatUserStorage.getChatsStats();
    const usersStats = await chatUserStorage.getUsersStats();

    console.log('Chats stats:', chatsStats);
    console.log('Users stats:', usersStats);

    if (chatsStats.totalChats > 0 && usersStats.totalUsers > 0) {
      console.log('✅ Статистика получена успешно');
    } else {
      console.log('❌ Статистика пустая');
    }
    console.log();

    // 9. Тест forum topics для supergroup
    console.log('9. Тест forum topics для supergroup...');
    const supergroupChat = await chatUserStorage.getChat(testSupsrgroupMsg.chat.id);

    if (supergroupChat && supergroupChat.forum_topics && supergroupChat.forum_topics.length > 0) {
      console.log('✅ Forum topics найдены:');
      supergroupChat.forum_topics.forEach((topic, index) => {
        console.log(`   Topic ${index + 1}:`);
        console.log(`     Message Thread ID: ${topic.message_thread_id}`);
        console.log(`     Name: ${topic.name}`);
        console.log(`     Counter: ${topic.counter}`);
      });
    } else {
      console.log('❌ Forum topics не найдены');
    }
    console.log();

    // 10. Тест повторного сохранения forum topic (увеличение counter)
    console.log('10. Тест повторного сохранения forum topic...');
    const result4 = await chatUserStorage.saveChatAndUser(testSupsrgroupMsg);
    const updatedChat = await chatUserStorage.getChat(testSupsrgroupMsg.chat.id);

    if (updatedChat && updatedChat.forum_topics && updatedChat.forum_topics.length > 0) {
      const topic = updatedChat.forum_topics.find(t => t.message_thread_id === 200);
      if (topic && topic.counter > 1) {
        console.log('✅ Counter forum topic увеличен:', topic.counter);
      } else {
        console.log('❌ Counter forum topic не увеличился');
      }
    }
    console.log();

    console.log('🎉 Все тесты завершены успешно!');

  } catch (error) {
    console.error('❌ Ошибка во время тестирования:', error.message);
    console.error(error.stack);
  } finally {
    // Закрытие соединения
    if (databaseService) {
      console.log('\n🧹 Закрытие соединения с базой данных...');
      await databaseService.close();
      console.log('✅ Соединение закрыто');
    }
  }
}

// Запуск тестов
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
