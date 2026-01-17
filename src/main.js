require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');
const MessageService = require('./services/messageService');
const GameService = require('./services/gameService');
const handlers = require('./handlers');

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

// Объект с сервисами для передачи в обработчики
const services = {
  get messageService() { return messageService; },
  get gameService() { return gameService; }
};

// Подключение к MongoDB
let db;
async function connectToMongoDB() {
  try {
    const client = new MongoClient(MONGODB_URL);
    await client.connect();
    db = client.db(MONGODB_DATABASE);
    gameService = new GameService(db);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

// Обработчик команды /start
bot.onText(/\/start/, async (msg) => {
  await handlers.handleStart(msg, services);
});

// Обработчик команды /help
bot.onText(/\/help/, async (msg) => {
  await handlers.handleHelp(msg, services);
});

// Обработчик команды /newgame
bot.onText(/\/newgame/, async (msg) => {
  await handlers.handleNewGame(msg, services);
});

// Обработчик команды /join
bot.onText(/\/join (.+)/, async (msg, match) => {
  await handlers.handleJoin(msg, match, services);
});

// Запуск подключения к MongoDB и бота
async function startBot() {
  await connectToMongoDB();
  console.log('Bot is running...');
}

startBot().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down bot...');
  await bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down bot...');
  await bot.stopPolling();
  process.exit(0);
});
