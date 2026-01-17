require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');
const MessageService = require('./services/messageService');

// Загрузка переменных окружения
const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGODB_URL = process.env.MONGODB_URL;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE;

// Инициализация бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Инициализация сервиса сообщений
const messageService = new MessageService(bot);

// Подключение к MongoDB
let db;
async function connectToMongoDB() {
  try {
    const client = new MongoClient(MONGODB_URL);
    await client.connect();
    db = client.db(MONGODB_DATABASE);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

// Обработчик команды /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'игрок';

  await messageService.sendWelcomeMessage(chatId, userName);
});

// Обработчик команды /help
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  await messageService.sendHelpMessage(chatId);
});

// Обработчик команды /newgame
bot.onText(/\/newgame/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // Создание новой игры в базе данных
    const gamesCollection = db.collection('games');
    const gameId = Date.now().toString(); // Простой ID на основе timestamp

    await gamesCollection.insertOne({
      gameId,
      creatorId: userId,
      players: [userId],
      status: 'waiting',
      createdAt: new Date()
    });

    await messageService.sendGameCreatedMessage(chatId, gameId);
  } catch (error) {
    console.error('Error creating new game:', error);
    await messageService.sendGameCreationErrorMessage(chatId);
  }
});

// Обработчик команды /join
bot.onText(/\/join (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const gameId = match[1];

  try {
    const gamesCollection = db.collection('games');
    const game = await gamesCollection.findOne({ gameId });

    if (!game) {
      await messageService.sendJoinErrorMessage(chatId, 'not_found');
      return;
    }

    if (game.players.includes(userId)) {
      await messageService.sendJoinErrorMessage(chatId, 'already_joined');
      return;
    }

    if (game.status !== 'waiting') {
      await messageService.sendJoinErrorMessage(chatId, 'game_started');
      return;
    }

    await gamesCollection.updateOne(
      { gameId },
      { $push: { players: userId } }
    );

    await messageService.sendJoinSuccessMessage(chatId, gameId);
  } catch (error) {
    console.error('Error joining game:', error);
    await messageService.sendJoinErrorMessage(chatId, 'general');
  }
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
