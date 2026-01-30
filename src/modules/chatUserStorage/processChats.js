#!/usr/bin/env node

/**
 * Скрипт для обработки чатов и сохранения количества пользователей
 * Выполняется по расписанию через планировщик
 */

require('dotenv').config();
const DatabaseService = require('../../services/databaseService');
const process = require('process');

// Конфигурация
const MONGODB_URL = process.env.MONGODB_URL;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE;
const DELAY_BETWEEN_CHATS = 1500; // Задержка между обработкой чатов в миллисекундах

/**
 * Функция для обработки чатов
 * @param {Object} bot - Экземпляр Telegram бота
 * @param {Object} databaseService - Экземпляр DatabaseService
 */
async function processChats(bot, databaseService) {
  console.log('[ProcessChats] Starting chat processing...');
  
  try {
    // Получаем коллекцию chats
    const chatsCollection = databaseService.getCollection('chats');
    
    // Получаем все чаты из базы данных, исключая kicked-чаты
    const chats = await chatsCollection.find({ kicked: { $ne: true } }).toArray();
    
    console.log(`[ProcessChats] Found ${chats.length} chats to process`);
    
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // Обрабатываем каждый чат
    for (const chat of chats) {
      processedCount++;
      console.log(`[ProcessChats] Processing chat ${processedCount}/${chats.length}: ${chat.id} (${chat.title || 'No title'})`);
      
      try {
        // Получаем количество участников чата через Telegram API
        const memberCount = await bot.getChatMemberCount(chat.id);
        
        // Обновляем документ чата, добавляя поле userCount
        await chatsCollection.updateOne(
          { id: chat.id },
          { 
            $set: { 
              userCount: memberCount,
              lastUserCountUpdate: new Date()
            }
          }
        );
        
        successCount++;
        console.log(`[ProcessChats] Chat ${chat.id}: ${memberCount} members updated successfully`);
        
      } catch (error) {
        errorCount++;
        console.error(`[ProcessChats] Error processing chat ${chat.id}:`, error.message);
        
        // Проверяем, является ли ошибка связана с тем, что бот исключен из чата
        const isKickedError = error.message.includes('bot was kicked') || 
                             error.message.includes('chat not found') ||
                             error.message.includes('403') ||
                             error.message.includes('404');
        
        // Обновляем документ чата, указывая ошибку
        try {
          const updateData = { 
            lastUserCountUpdate: new Date(),
          };
          
          // Если это ошибка исключения бота из чата, устанавливаем флаг kicked
          if (isKickedError) {
            updateData.kicked = true;
            console.log(`[ProcessChats] Chat ${chat.id} marked as kicked due to error: ${error.message}`);
          }
          
          await chatsCollection.updateOne(
            { id: chat.id },
            { $set: updateData }
          );
        } catch (updateError) {
          console.error(`[ProcessChats] Error updating chat ${chat.id} with error info:`, updateError.message);
        }
      }
      
      // Делаем паузу между обработкой чатов (кроме последнего)
      if (processedCount < chats.length) {
        console.log(`[ProcessChats] Waiting ${DELAY_BETWEEN_CHATS}ms before processing next chat...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHATS));
      }
    }
    
    console.log(`[ProcessChats] Processing completed:`);
    console.log(`  - Total chats: ${chats.length}`);
    console.log(`  - Successfully processed: ${successCount}`);
    console.log(`  - Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('[ProcessChats] Fatal error during chat processing:', error);
    throw error;
  }
}

/**
 * Главная функция
 */
async function main() {
  console.log('[ProcessChats] Starting chat user count processor...');
  
  // Проверяем наличие необходимых переменных окружения
  if (!MONGODB_URL || !MONGODB_DATABASE) {
    console.error('[ProcessChats] Error: Missing required environment variables (MONGODB_URL, MONGODB_DATABASE)');
    process.exit(1);
  }
  
  let databaseService;
  let bot;
  
  try {
    // Создаем новый экземпляр бота для обработки чатов
    const TelegramBot = require('node-telegram-bot-api');
    const BOT_TOKEN = process.env.BOT_TOKEN;
    
    if (!BOT_TOKEN) {
      throw new Error('BOT_TOKEN environment variable is required');
    }
    
    bot = new TelegramBot(BOT_TOKEN, { polling: false });
    console.log('[ProcessChats] Bot instance created successfully');
    
    // Подключаемся к MongoDB
    databaseService = new DatabaseService(MONGODB_URL, MONGODB_DATABASE);
    await databaseService.connect();
    
    console.log('[ProcessChats] Connected to database successfully');
    
    // Запускаем обработку чатов
    await processChats(bot, databaseService);
    
    console.log('[ProcessChats] Chat processing completed successfully');
    
  } catch (error) {
    console.error('[ProcessChats] Fatal error:', error);
    process.exit(1);
  } finally {
    // Закрываем соединение с базой данных
    if (databaseService) {
      try {
        await databaseService.close();
        console.log('[ProcessChats] Database connection closed');
      } catch (error) {
        console.error('[ProcessChats] Error closing database connection:', error);
      }
    }
    
    // Останавливаем бота
    if (bot) {
      try {
        await bot.stopPolling();
        console.log('[ProcessChats] Bot polling stopped');
      } catch (error) {
        console.error('[ProcessChats] Error stopping bot polling:', error);
      }
    }
  }
}

// Запускаем скрипт, если он вызывается напрямую
if (require.main === module) {
  main().catch(error => {
    console.error('[ProcessChats] Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { processChats };
