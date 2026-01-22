require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const DatabaseService = require('./services/databaseService');
const MessageService = require('./services/messageService');
const GameService = require('./services/gameService');
const UserStatsService = require('./services/userStatsService');
const handlers = require('./handlers/index');

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

// Объект с сервисами для передачи в обработчики
const services = {
  get messageService() { return messageService; },
  get gameService() { return gameService; },
  get userStatsService() { return userStatsService; },
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
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

// Установка команд для бота
async function setBotCommands() {
  const commands = [
    { command: 'start', description: 'Запуск бота и приветствие пользователя' },
    { command: 'help', description: 'Показать список всех доступных команд' },
    { command: 'rules', description: 'Показать правила игры' },
    { command: 'profile', description: 'Показать профиль игрока или статистику' },
    { command: 'endgame', description: 'Начать голосование за окончание игры' }
  ];

  try {
    await bot.setMyCommands(commands);
    console.log('Bot commands set successfully');
  } catch (error) {
    console.error('Error setting bot commands:', error);
  }
}

// Запуск подключения к MongoDB и бота
async function startBot() {
  await connectToMongoDB();
  await setBotCommands();

  // Обработчик команды /start
  bot.onText(/\/start/, async (msg) => {
    if (messageService.rateLimiter.isRateLimited(msg.chat.id)) {
      console.log(`Command /start ignored for chat ${msg.chat.id} due to rate limit`);
      return;
    }
    await handlers.handleStart(msg, services);
  });

  // Обработчик команды /help
  bot.onText(/\/help/, async (msg) => {
    if (messageService.rateLimiter.isRateLimited(msg.chat.id)) {
      console.log(`Command /help ignored for chat ${msg.chat.id} due to rate limit`);
      return;
    }
    await handlers.handleHelp(msg, services);
  });

  // Обработчик команды /rules
  bot.onText(/\/rules/, async (msg) => {
    if (messageService.rateLimiter.isRateLimited(msg.chat.id)) {
      console.log(`Command /rules ignored for chat ${msg.chat.id} due to rate limit`);
      return;
    }
    await handlers.handleRules(msg, services);
  });

  // Обработчик команды /profile
  bot.onText(/\/profile/, async (msg) => {
    if (messageService.rateLimiter.isRateLimited(msg.chat.id)) {
      console.log(`Command /profile ignored for chat ${msg.chat.id} due to rate limit`);
      return;
    }
    await handlers.handleProfile(msg, services);
  });

  // Обработчик команды /endgame
  bot.onText(/\/endgame/, async (msg) => {
    if (messageService.rateLimiter.isRateLimited(msg.chat.id)) {
      console.log(`Command /endgame ignored for chat ${msg.chat.id} due to rate limit`);
      return;
    }
    await handlers.handleEndGame(msg, services);
  });

  // Обработчик callback_query от inline кнопок
  bot.on('callback_query', async (query) => {
    if (messageService.rateLimiter.isRateLimited(query.message.chat.id)) {
      console.log(`Callback query ignored for chat ${query.message.chat.id} due to rate limit`);
      return;
    }
    await handlers.handleCallbackQuery(query, services);
  });

  console.log('Bot is running...');
}

startBot().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down bot...');
  messageService.rateLimiter.stop();
  await bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down bot...');
  messageService.rateLimiter.stop();
  await bot.stopPolling();
  process.exit(0);
});
