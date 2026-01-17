// Конфигурация приложения
require('dotenv').config();

const config = {
  // Telegram Bot
  botToken: process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE',

  // MongoDB
  mongoUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017',
  mongoDatabase: process.env.MONGODB_DATABASE || 'cashflow',

  // Node environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Bot settings
  maxPlayers: 6,
  minPlayers: 1,
  cleanupInterval: 24 * 60 * 60 * 1000, // 24 часа в миллисекундах
};

module.exports = config;
