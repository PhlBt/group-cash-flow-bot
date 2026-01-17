const TelegramBot = require('node-telegram-bot-api');
const CashFlowGame = require('./game');
const { setupHandlers, setupBotCommands } = require('./handlers');

// Замените на ваш токен от @BotFather
const TOKEN = '7028125967:AAFRW1FnqP67ZHgs8Fyu79bZq7b2bgxi_PA';

const bot = new TelegramBot(TOKEN, { polling: true });

// Хранилище игр по chatId
const games = new Map();

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

// Настройка хендлеров
setupHandlers(bot, games, messageQueue, sendMessage, require('./handlers'), CashFlowGame);

// Установка команд
setupBotCommands(bot);

console.log('🤖 CashFlow бот запущен!');
