require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const DatabaseService = require('./services/databaseService');
const MessageService = require('./services/messageService');
const GameService = require('./services/gameService');
const UserStatsService = require('./services/userStatsService');
const handlers = require('./handlers/index');
const { getThreadId } = require('./utils');

// Загрузка переменных окружения
const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGODB_URL = process.env.MONGODB_URL;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE;

// Инициализация бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Инициализация сервиса сообщений
const messageService = new MessageService(bot);

// Инициализация сервиса игры (будет установлен после подключения к БД)
let gameService;
let userStatsService;
let chatUserStorage;
let chatUserCountScheduler;
let threadRestrictionService;

// Объект с сервисами для передачи в обработчики
const services = {
  get messageService() { return messageService; },
  get gameService() { return gameService; },
  get userStatsService() { return userStatsService; },
  get chatUserStorage() { return chatUserStorage; },
  get threadRestrictionService() { return threadRestrictionService; },
  get bot() { return bot; }
};

// Подключение к MongoDB
let databaseService;
async function connectToMongoDB() {
  try {
    databaseService = new DatabaseService(MONGODB_URL, MONGODB_DATABASE);
    await databaseService.connect();
    userStatsService = new UserStatsService(databaseService);
    gameService = new GameService(databaseService, userStatsService, messageService);
    
    // Инициализация модуля хранения данных пользователей и чатов
    const ChatUserStorage = require('./modules/chatUserStorage');
    chatUserStorage = new ChatUserStorage(databaseService);
    await chatUserStorage.init();
    console.log('ChatUserStorage initialized successfully');
    
    // Инициализация сервиса управления ограничениями тем
    const ThreadRestrictionService = require('./services/threadRestrictionService');
    threadRestrictionService = new ThreadRestrictionService(databaseService);
    await threadRestrictionService.init();
    console.log('ThreadRestrictionService initialized successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

// Установка команд для бота
async function setBotCommands() {
  const commands = [
    { command: 'start', description: 'Запуск бота' },
    { command: 'help', description: 'Список всех команд' },
    { command: 'rules', description: 'Правила игры' },
    { command: 'profile', description: 'Профиль игрока' },
    { command: 'leave', description: 'Выйти из игры' },
    { command: 'votekick', description: 'Начать голосование за исключение игрока' },
    { command: 'endgame', description: 'Начать голосование за окончание игры' },
    { command: 'adminopenthread', description: 'Открыть тему для команд бота' },
    { command: 'adminclosethread', description: 'Закрыть тему для команд бота' }
  ];

  try {
    await bot.setMyCommands(commands);
    console.log('Bot commands set successfully');
  } catch (error) {
    console.error('Error setting bot commands:', error);
  }
}

// Инициализация планировщика обновления количества пользователей в чатах
async function initScheduler() {
  try {
    // Инициализация планировщика обновления количества пользователей в чатах
    const ChatUserCountScheduler = require('./modules/scheduler/chatUserCountScheduler');
    chatUserCountScheduler = new ChatUserCountScheduler();
    chatUserCountScheduler.init(bot, databaseService);
    chatUserCountScheduler.start();
    console.log('ChatUserCountScheduler initialized and started successfully');
  } catch (error) {
    console.error('Error initializing scheduler:', error);
  }
}

// Функция проверки thread-ограничений для команд
async function checkThreadRestrictions(chatId, threadId, bot, chatUserStorage, threadRestrictionService) {
  try {
    // Проверяем, что это супергруппа
    const chat = await bot.getChat(chatId);
    if (chat.type !== 'supergroup') {
      return true; // Разрешаем команду в обычных чатах
    }

    // Проверяем наличие ограничений
    const hasRestrictions = await threadRestrictionService.hasRestrictions(chatId);
    if (!hasRestrictions) {
      return true; // Разрешаем команду если нет ограничений
    }

    // Проверяем, разрешена ли команда в этой теме
    const isAllowed = await threadRestrictionService.isThreadRestricted(chatId, threadId);
    return isAllowed;
  } catch (error) {
    console.error('Error checking thread restrictions:', error);
    return true; // В случае ошибки разрешаем команду
  }
}

// Запуск подключения к MongoDB и бота
async function startBot() {
  await connectToMongoDB();
  await initScheduler();
  await setBotCommands();

  // Устанавливаем экземпляр бота в ErrorStateManager
  const ErrorStateManager = require('./utils/errorStateManager');
  ErrorStateManager.setBotInstance(bot);

  // Обработчик команды /start
  bot.onText(/\/start/, async (msg) => {
    if (messageService.rateLimiter.isRateLimited(msg.chat.id)) {
      console.log(`Command /start ignored for chat ${msg.chat.id} due to rate limit`);
      return;
    }
    
    // Проверяем thread-ограничения (кроме admin команд)
    const threadId = getThreadId(msg);
    const isAllowed = await checkThreadRestrictions(msg.chat.id, threadId, bot, chatUserStorage, threadRestrictionService);
    if (!isAllowed) {
      return; // Не отправляем сообщение, просто игнорируем команду
    }
    
    // Сохраняем данные чата и пользователя
    await chatUserStorage.saveChatAndUser(msg);
    
    await handlers.handleStart(msg, services);
  });

  // Обработчик команды /help
  bot.onText(/\/help/, async (msg) => {
    if (messageService.rateLimiter.isRateLimited(msg.chat.id)) {
      console.log(`Command /help ignored for chat ${msg.chat.id} due to rate limit`);
      return;
    }
    
    // Проверяем thread-ограничения (кроме admin команд)
    const threadId = getThreadId(msg);
    const isAllowed = await checkThreadRestrictions(msg.chat.id, threadId, bot, chatUserStorage, threadRestrictionService);
    if (!isAllowed) {
      return; // Не отправляем сообщение, просто игнорируем команду
    }
    
    // Сохраняем данные чата и пользователя
    await chatUserStorage.saveChatAndUser(msg);
    
    // Передаем все необходимые сервисы для проверки прав администратора
    await handlers.handleHelp(msg, {
      messageService,
      bot,
      chatUserStorage
    });
  });

  // Обработчик команды /rules
  bot.onText(/\/rules/, async (msg) => {
    if (messageService.rateLimiter.isRateLimited(msg.chat.id)) {
      console.log(`Command /rules ignored for chat ${msg.chat.id} due to rate limit`);
      return;
    }
    
    // Проверяем thread-ограничения (кроме admin команд)
    const threadId = getThreadId(msg);
    const isAllowed = await checkThreadRestrictions(msg.chat.id, threadId, bot, chatUserStorage, threadRestrictionService);
    if (!isAllowed) {
      return; // Не отправляем сообщение, просто игнорируем команду
    }
    
    // Сохраняем данные чата и пользователя
    await chatUserStorage.saveChatAndUser(msg);
    
    await handlers.handleRules(msg, services);
  });

  // Обработчик команды /profile
  bot.onText(/\/profile/, async (msg) => {
    if (messageService.rateLimiter.isRateLimited(msg.chat.id)) {
      console.log(`Command /profile ignored for chat ${msg.chat.id} due to rate limit`);
      return;
    }
    
    // Проверяем thread-ограничения (кроме admin команд)
    const threadId = getThreadId(msg);
    const isAllowed = await checkThreadRestrictions(msg.chat.id, threadId, bot, chatUserStorage, threadRestrictionService);
    if (!isAllowed) {
      return; // Не отправляем сообщение, просто игнорируем команду
    }
    
    // Сохраняем данные чата и пользователя
    await chatUserStorage.saveChatAndUser(msg);
    
    await handlers.handleProfile(msg, services);
  });

  // Обработчик команды /leave
  bot.onText(/\/leave/, async (msg) => {
    if (messageService.rateLimiter.isRateLimited(msg.chat.id)) {
      console.log(`Command /leave ignored for chat ${msg.chat.id} due to rate limit`);
      return;
    }
    
    // Проверяем thread-ограничения (кроме admin команд)
    const threadId = getThreadId(msg);
    const isAllowed = await checkThreadRestrictions(msg.chat.id, threadId, bot, chatUserStorage, threadRestrictionService);
    if (!isAllowed) {
      return; // Не отправляем сообщение, просто игнорируем команду
    }
    
    // Сохраняем данные чата и пользователя
    await chatUserStorage.saveChatAndUser(msg);
    
    await handlers.handleLeave(msg, services);
  });

  // Обработчик команды /endgame
  bot.onText(/\/endgame/, async (msg) => {
    if (messageService.rateLimiter.isRateLimited(msg.chat.id)) {
      console.log(`Command /endgame ignored for chat ${msg.chat.id} due to rate limit`);
      return;
    }
    
    // Проверяем thread-ограничения (кроме admin команд)
    const threadId = getThreadId(msg);
    const isAllowed = await checkThreadRestrictions(msg.chat.id, threadId, bot, chatUserStorage, threadRestrictionService);
    if (!isAllowed) {
      return; // Не отправляем сообщение, просто игнорируем команду
    }
    
    // Сохраняем данные чата и пользователя
    await chatUserStorage.saveChatAndUser(msg);
    
    await handlers.handleEndGame(msg, services);
  });

  // Обработчик команды /votekick
  bot.onText(/\/votekick/, async (msg) => {
    if (messageService.rateLimiter.isRateLimited(msg.chat.id)) {
      console.log(`Command /votekick ignored for chat ${msg.chat.id} due to rate limit`);
      return;
    }
    
    // Проверяем thread-ограничения (кроме admin команд)
    const threadId = getThreadId(msg);
    const isAllowed = await checkThreadRestrictions(msg.chat.id, threadId, bot, chatUserStorage, threadRestrictionService);
    if (!isAllowed) {
      return; // Не отправляем сообщение, просто игнорируем команду
    }
    
    // Сохраняем данные чата и пользователя
    await chatUserStorage.saveChatAndUser(msg);
    
    await handlers.handleVoteKick(msg, services);
  });

  // Обработчик команды /adminopenthread
  bot.onText(/\/adminopenthread/, async (msg) => {
    if (messageService.rateLimiter.isRateLimited(msg.chat.id)) {
      console.log(`Command /adminopenthread ignored for chat ${msg.chat.id} due to rate limit`);
      return;
    }
    
    // Сохраняем данные чата и пользователя
    await chatUserStorage.saveChatAndUser(msg);
    
    await handlers.handleAdminOpenThread(msg, services);
  });

  // Обработчик команды /adminclosethread
  bot.onText(/\/adminclosethread/, async (msg) => {
    if (messageService.rateLimiter.isRateLimited(msg.chat.id)) {
      console.log(`Command /adminclosethread ignored for chat ${msg.chat.id} due to rate limit`);
      return;
    }
    
    // Сохраняем данные чата и пользователя
    await chatUserStorage.saveChatAndUser(msg);
    
    await handlers.handleAdminCloseThread(msg, services);
  });

  // Обработчик callback_query от inline кнопок
  bot.on('callback_query', async (query) => {
    if (messageService.rateLimiter.isRateLimited(query.message.chat.id)) {
      console.log(`Callback query ignored for chat ${query.message.chat.id} due to rate limit`);
      return;
    }

    console.log('msg', query)
    
    // Сохраняем данные чата и пользователя из callback query
    await chatUserStorage.saveQueryChatAndUser(query);
    
    await handlers.handleCallbackQuery(query, services);
  });

  // Обработчик текстовых сообщений (для перехвата описания ошибки)
  bot.on('message', async (msg) => {
    if (messageService.rateLimiter.isRateLimited(msg.chat.id)) {
      console.log(`Message ignored for chat ${msg.chat.id} due to rate limit`);
      return;
    }

    // Сохраняем данные чата и пользователя для всех сообщений
    await chatUserStorage.saveChatAndUser(msg);

    // Проверяем, является ли сообщение текстом и есть ли reply_to_message
    if (msg.text && msg.reply_to_message) {
      // Проверяем, ожидает ли пользователь ввода описания ошибки
      if (ErrorStateManager.isWaiting(msg.from.id)) {
        // Проверяем, что это ответ на наше сообщение о запросе ошибки
        const waitingState = ErrorStateManager.getWaitingState(msg.from.id);
        if (waitingState && waitingState.messageId === msg.reply_to_message.message_id) {
          // Обрабатываем описание ошибки
          await handlers.handleErrorMessage(msg, services);
          return;
        }
      }
    }
  });

  console.log('Bot is running...');
}

startBot().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down bot...');
  if (chatUserCountScheduler) {
    chatUserCountScheduler.stop();
    console.log('ChatUserCountScheduler stopped');
  }
  messageService.rateLimiter.stop();
  await bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down bot...');
  if (chatUserCountScheduler) {
    chatUserCountScheduler.stop();
    console.log('ChatUserCountScheduler stopped');
  }
  messageService.rateLimiter.stop();
  await bot.stopPolling();
  process.exit(0);
});
