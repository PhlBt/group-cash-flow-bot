# ChatUserStorage Module

Универсальный модуль для хранения данных пользователей и чатов в Telegram ботах.

## Особенности

- **Универсальность**: Может использоваться в любом Telegram боте
- **Автоматическое управление**: Самостоятельно создает индексы и управляет подключением
- **Связи между коллекциями**: Автоматически поддерживает связи между пользователями и чатами
- **Счетчики**: Автоматически увеличивает счетчики вызовов
- **Forum Topics**: Поддержка forum topics для supergroup чатов

## Установка

Модуль уже интегрирован в проект. Для использования в других ботах:

```javascript
const ChatUserStorage = require('./modules/chatUserStorage');
```

## Использование

### Базовое использование

```javascript
const ChatUserStorage = require('./modules/chatUserStorage');

// Инициализация с существующим DatabaseService
const chatUserStorage = new ChatUserStorage(databaseService);
await chatUserStorage.init();

// Сохранение данных из сообщения
await chatUserStorage.saveChatAndUser(msg);

// Сохранение данных из callback query
await chatUserStorage.saveQueryChatAndUser(query);
```

### Пример интеграции в Telegram бот

```javascript
const TelegramBot = require('node-telegram-bot-api');
const DatabaseService = require('./services/databaseService');
const ChatUserStorage = require('./modules/chatUserStorage');

const bot = new TelegramBot(token, { polling: true });
const databaseService = new DatabaseService(mongoUrl, dbName);
await databaseService.connect();

const chatUserStorage = new ChatUserStorage(databaseService);
await chatUserStorage.init();

// В обработчике сообщений
bot.on('message', async (msg) => {
  // Сохраняем данные чата и пользователя
  await chatUserStorage.saveChatAndUser(msg);
  
  // Обрабатываем сообщение
  // ...
});

// В обработчике callback query
bot.on('callback_query', async (query) => {
  // Сохраняем данные из callback query
  await chatUserStorage.saveQueryChatAndUser(query);
  
  // Обрабатываем callback
  // ...
});
```

## API

### Конструктор

```javascript
new ChatUserStorage(databaseService)
```

**Параметры:**
- `databaseService` - Экземпляр DatabaseService с подключением к MongoDB

### Методы

#### `init()`
Инициализирует коллекции и создает индексы.

```javascript
await chatUserStorage.init();
```

#### `saveChat(msg)`
Сохраняет данные чата в базу данных.

**Параметры:**
- `msg` - Объект сообщения Telegram API

**Возвращает:**
```javascript
{
  success: boolean,
  action: 'created' | 'updated',
  chatId: number
}
```

#### `saveUser(msg)`
Сохраняет данные пользователя в базу данных.

**Параметры:**
- `msg` - Объект сообщения Telegram API

**Возвращает:**
```javascript
{
  success: boolean,
  action: 'created' | 'updated',
  userId: number
}
```

#### `saveChatAndUser(msg)`
Комплексное сохранение данных чата и пользователя.

**Параметры:**
- `msg` - Объект сообщения Telegram API

**Возвращает:**
```javascript
{
  success: boolean,
  chat: { success, action, chatId },
  user: { success, action, userId }
}
```

#### `saveQueryChatAndUser(query)`
Сохраняет данные из callback query.

**Параметры:**
- `query` - Объект callback query Telegram API

**Возвращает:**
```javascript
{
  success: boolean,
  chat: { success, action, chatId },
  user: { success, action, userId }
}
```

#### `getChat(chatId)`
Получает данные чата из базы.

**Параметры:**
- `chatId` - ID чата

**Возвращает:**
Объект чата или `null`

#### `getUser(userId)`
Получает данные пользователя из базы.

**Параметры:**
- `userId` - ID пользователя

**Возвращает:**
Объект пользователя или `null`

#### `incrementChatCounter(chatId)`
Увеличивает счетчик вызовов для чата.

**Параметры:**
- `chatId` - ID чата

**Возвращает:**
```javascript
{
  success: boolean,
  modifiedCount: number
}
```

#### `incrementUserCounter(userId)`
Увеличивает счетчик вызовов для пользователя.

**Параметры:**
- `userId` - ID пользователя

**Возвращает:**
```javascript
{
  success: boolean,
  modifiedCount: number
}
```

#### `getChatsStats()`
Получает статистику по чатам.

**Возвращает:**
```javascript
{
  totalChats: number,
  totalCounter: number
}
```

#### `getUsersStats()`
Получает статистику по пользователям.

**Возвращает:**
```javascript
{
  totalUsers: number,
  totalCounter: number
}
```

## Структура данных

### Коллекция `chats`

```javascript
{
  id: number,              // ID чата (уникальный индекс)
  type: string,            // тип чата
  title: string,           // название чата
  username: string,        // username чата
  counter: number,         // счетчик вызовов
  created_at: Date,
  updated_at: Date,
  forum_topics: [          // только для supergroup
    {
      message_thread_id: number,
      name: string,                    // из forum_topic_created.name
      icon_color: number,              // из forum_topic_created.icon_color
      icon_custom_emoji_id: string,    // из forum_topic_created.icon_custom_emoji_id
      counter: number
    }
  ],
  user_ids: [number]       // массив уникальных ID пользователей
}
```

### Коллекция `users`

```javascript
{
  id: number,              // ID пользователя (уникальный индекс)
  first_name: string,
  last_name: string,
  username: string,
  language_code: string,
  is_bot: boolean,
  counter: number,         // счетчик вызовов
  created_at: Date,
  updated_at: Date,
  chat_ids: [number]       // массив уникальных ID чатов
}
```

## Индексы

Модуль автоматически создает следующие индексы:

- `chats.id` - уникальный индекс
- `chats.forum_topics.message_thread_id` - для быстрого поиска
- `users.id` - уникальный индекс

## Forum Topics

Для чатов типа `supergroup` модуль автоматически обрабатывает forum topics:

1. При первом появлении forum topic создается новая запись с `counter: 1`
2. При повторных вызовах с тем же `message_thread_id` увеличивается `counter`
3. Все поля из `forum_topic_created` сохраняются на одном уровне с `message_thread_id`

## Логика работы

### Сохранение чата

1. Проверка существования чата по `id`
2. Если существует:
   - Обновление `updated_at`
   - Увеличение `counter`
   - Добавление пользователя в `user_ids` (если его там нет)
   - Обработка forum topics (если применимо)
3. Если не существует:
   - Создание новой записи с `created_at` и `counter: 1`
   - Добавление пользователя в `user_ids`
   - Обработка forum topics (если применимо)

### Сохранение пользователя

1. Проверка существования пользователя по `id`
2. Если существует:
   - Обновление данных пользователя
   - Увеличение `counter`
   - Добавление чата в `chat_ids` (если его там нет)
3. Если не существует:
   - Создание новой записи с `created_at` и `counter: 1`
   - Добавление чата в `chat_ids`

### Связи между коллекциями

Модуль автоматически поддерживает связи:
- В чате хранится массив `user_ids` с уникальными ID пользователей
- В пользователе хранится массив `chat_ids` с уникальными ID чатов
- При добавлении новых данных проверяется уникальность ID

## Ошибки

Модуль возвращает объекты с полем `success: false` и `error` в случае ошибок:

```javascript
{
  success: false,
  error: 'Invalid chat data' | 'Invalid user data' | string
}
```

## Примеры

### Простой пример

```javascript
const ChatUserStorage = require('./modules/chatUserStorage');

async function example() {
  const chatUserStorage = new ChatUserStorage(databaseService);
  await chatUserStorage.init();
  
  // Сохранение данных
  const result = await chatUserStorage.saveChatAndUser(msg);
  
  if (result.success) {
    console.log('Data saved successfully');
    console.log('Chat action:', result.chat.action);
    console.log('User action:', result.user.action);
  } else {
    console.error('Error saving data:', result.chat.error || result.user.error);
  }
}
```

### Получение статистики

```javascript
const chatsStats = await chatUserStorage.getChatsStats();
const usersStats = await chatUserStorage.getUsersStats();

console.log(`Total chats: ${chatsStats.totalChats}, total calls: ${chatsStats.totalCounter}`);
console.log(`Total users: ${usersStats.totalUsers}, total calls: ${usersStats.totalCounter}`);
```

### Работа с конкретными записями

```javascript
// Получение данных чата
const chat = await chatUserStorage.getChat(123456789);
if (chat) {
  console.log(`Chat "${chat.title}" has ${chat.user_ids.length} users`);
}

// Получение данных пользователя
const user = await chatUserStorage.getUser(987654321);
if (user) {
  console.log(`User "${user.username}" participated in ${user.chat_ids.length} chats`);
}
```

## Тестирование

### Запуск тестов

Для запуска комплексных тестов:

```bash
# Запуск всех тестов
node src/modules/chatUserStorage/test/chatUserStorage.test.js

# Запуск с указанием MongoDB URI (если нужно)
MONGODB_URL="mongodb://localhost:27017/test_bot" node src/modules/chatUserStorage/test/chatUserStorage.test.js
```

### Требования

- MongoDB должен быть запущен локально на порту 27017
- База данных `test_bot` будет создана автоматически
- Все тесты используют изолированную базу данных для тестирования

### Изолированное тестирование

Модуль можно тестировать в изолированной среде:

```javascript
const ChatUserStorage = require('./modules/chatUserStorage');
const DatabaseService = require('./services/databaseService');

// Создаем тестовое подключение
const testDb = new DatabaseService('mongodb://localhost:27017/test', 'test_bot');
await testDb.connect();

// Инициализируем модуль
const storage = new ChatUserStorage(testDb);
await storage.init();

// Тестируем сохранение
const testMsg = {
  chat: { id: 123, type: 'group', title: 'Test Group' },
  from: { id: 456, first_name: 'Test', username: 'testuser' }
};

const result = await storage.saveChatAndUser(testMsg);
console.log('Test result:', result);

// Проверяем статистику
const stats = await storage.getChatsStats();
console.log('Stats:', stats);

// Закрываем соединение
await testDb.close();
```

### Что тестируется

1. **Подключение к базе данных** - Проверка успешного подключения к MongoDB
2. **Инициализация модуля** - Проверка создания коллекций и индексов
3. **Сохранение данных** - Тест сохранения чата и пользователя
4. **Обновление данных** - Тест повторного сохранения (увеличение счетчиков)
5. **Supergroup с forum topics** - Тест специальной логики для supergroup чатов
6. **Получение данных** - Тест чтения данных из базы
7. **Увеличение счетчиков** - Тест ручного увеличения счетчиков
8. **Статистика** - Тест получения статистики по чатам и пользователям
9. **Forum topics** - Тест создания и обновления forum topics
10. **Повторное сохранение forum topic** - Тест увеличения counter для существующего forum topic

## Безопасность

- Все операции выполняются через безопасные MongoDB запросы
- Используются уникальные индексы для предотвращения дубликатов
- Автоматическая валидация входных данных
- Обработка ошибок на всех уровнях

## Производительность

- Автоматическое создание индексов для оптимальной производительности
- Использование существующего подключения к базе данных
- Эффективные bulk операции при необходимости
- Кэширование коллекций после инициализации
