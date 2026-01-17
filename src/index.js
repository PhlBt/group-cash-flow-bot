const TelegramBot = require('node-telegram-bot-api');
const gameManager = require('./services/gameManager');
const dbService = require('./services/dbService');
const { getStartInlineKeyboard, getGameActionsKeyboard, getJoinSuccessKeyboard, getCardKeyboard, getLoansKeyboard, getSellAssetKeyboard, getDealActionsKeyboard, getFastTrackKeyboard, getFastTrackRollKeyboard, getPlayerTurnKeyboard } = require('./utils/keyboards');
const { formatPlayerInfo, formatCard, formatAssetsForSale } = require('./utils/formatters');
const config = require('./config');

// Инициализация бота
const bot = new TelegramBot(config.botToken, { polling: true });

// Подключение к БД при запуске
async function initializeDatabase() {
  try {
    await dbService.connect();
    // Очистка старых игр при запуске
    await dbService.cleanupOldGames();
    console.log('✅ База данных инициализирована');
  } catch (error) {
    console.error('❌ Ошибка инициализации БД:', error);
    process.exit(1);
  }
}

// Инициализация
initializeDatabase();

// Очередь сообщений для синхронизации отправки
class MessageQueue {
  constructor() {
    this.queues = new Map(); // chatId -> Promise
  }

  async send(chatId, text, options = {}) {
    // Если очередь для этого чата не существует, создаем промис, который сразу выполняется
    if (!this.queues.has(chatId)) {
      this.queues.set(chatId, Promise.resolve());
    }

    // Добавляем новое сообщение в очередь
    const previousPromise = this.queues.get(chatId);
    const newPromise = previousPromise
      .then(() => bot.sendMessage(chatId, text, options))
      .catch(err => {
        console.error(`Ошибка отправки сообщения в чат ${chatId}:`, err);
        // Продолжаем выполнение очереди даже при ошибке
        return null;
      });

    this.queues.set(chatId, newPromise);
    return newPromise;
  }

  async sendMultiple(chatId, messages) {
    for (const msg of messages) {
      await this.send(chatId, msg.text, msg.options);
    }
  }
}

const messageQueue = new MessageQueue();

// Обертка для отправки сообщений через очередь
async function sendMessage(chatId, text, options = {}) {
  return messageQueue.send(chatId, text, options);
}

// Установка глобальных команд меню
async function setupBotCommands() {
  const commands = [
    { command: 'start', description: 'Начать работу с ботом' },
    { command: 'join', description: 'Присоединиться к игре' },
    { command: 'startgame', description: 'Начать игру' },
    { command: 'roll', description: 'Бросить кубик' },
    { command: 'status', description: 'Статус игры' },
    { command: 'myinfo', description: 'Моя информация' },
    { command: 'rules', description: 'Правила игры' },
    { command: 'help', description: 'Справка по командам' },
    { command: 'endgame', description: 'Завершить игру' }
  ];

  try {
    await bot.setMyCommands(commands);
    console.log('✅ Глобальные команды установлены');
  } catch (error) {
    console.error('Ошибка установки команд:', error);
  }
}

// Вызов установки команд при запуске
setupBotCommands();

console.log('🤖 CashFlow бот запущен!');

// Импорт всех команд из controllers
require('./controllers/botController')(bot, gameManager, messageQueue, sendMessage, getStartInlineKeyboard, formatPlayerInfo, getJoinSuccessKeyboard, getGameActionsKeyboard, getCardKeyboard, getLoansKeyboard, getSellAssetKeyboard, getDealActionsKeyboard, getFastTrackKeyboard, getFastTrackRollKeyboard, getPlayerTurnKeyboard, formatCard, formatAssetsForSale);
