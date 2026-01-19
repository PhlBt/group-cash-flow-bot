require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const DatabaseService = require('./services/databaseService');
const MessageService = require('./services/messageService');
const GameService = require('./services/gameService');
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

// Объект с сервисами для передачи в обработчики
const services = {
  get messageService() { return messageService; },
  get gameService() { return gameService; },
  get bot() { return bot; }
};

// Подключение к MongoDB
let databaseService;
async function connectToMongoDB() {
  try {
    databaseService = new DatabaseService(MONGODB_URL, MONGODB_DATABASE);
    await databaseService.connect();
    gameService = new GameService(databaseService);
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

// Обработчик команды /play
bot.onText(/\/play (.+)/, async (msg, match) => {
  await handlers.handlePlay(msg, match, services);
});

// Обработчик команды /endgame
bot.onText(/\/endgame/, async (msg) => {
  await handlers.handleEndGame(msg, services);
});

// Обработчик callback_query от inline кнопок
bot.on('callback_query', async (query) => {
  await handlers.handleCallbackQuery(query, services);
});

// Установка команд для бота
async function setBotCommands() {
  const commands = [
    { command: 'start', description: 'Запуск бота и приветствие пользователя' },
    { command: 'help', description: 'Показать список всех доступных команд' },
    { command: 'newgame', description: 'Создать новую игровую сессию' },
    { command: 'play', description: 'Начать игру' },
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
  await setBotCommands();
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
