require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');

// Загрузка переменных окружения
const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGODB_URL = process.env.MONGODB_URL;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE;

// Инициализация бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

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
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'игрок';

  bot.sendMessage(chatId, `Привет, ${userName}! Добро пожаловать в игру CashFlow. Используй /help для получения списка команд.`);
});

// Обработчик команды /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  const helpText = `
*Команды бота CashFlow:*

/start - Начать игру
/help - Показать эту справку
/newgame - Создать новую игру
/join - Присоединиться к игре

*О игре:*
CashFlow - настольная игра о финансовом планировании.
  `;

  bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
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

    bot.sendMessage(chatId, `Новая игра создана! ID игры: ${gameId}. Другие игроки могут присоединиться с помощью команды /join ${gameId}`);
  } catch (error) {
    console.error('Error creating new game:', error);
    bot.sendMessage(chatId, 'Ошибка при создании игры. Попробуйте еще раз.');
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
      bot.sendMessage(chatId, 'Игра с таким ID не найдена.');
      return;
    }

    if (game.players.includes(userId)) {
      bot.sendMessage(chatId, 'Вы уже присоединились к этой игре.');
      return;
    }

    if (game.status !== 'waiting') {
      bot.sendMessage(chatId, 'Игра уже начата или завершена.');
      return;
    }

    await gamesCollection.updateOne(
      { gameId },
      { $push: { players: userId } }
    );

    bot.sendMessage(chatId, `Вы присоединились к игре ${gameId}!`);
  } catch (error) {
    console.error('Error joining game:', error);
    bot.sendMessage(chatId, 'Ошибка при присоединении к игре. Попробуйте еще раз.');
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
