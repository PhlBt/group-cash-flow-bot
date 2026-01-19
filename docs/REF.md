# Гайд по рефакторингу кода проекта CashFlow

## 🎯 Цели рефакторинга

- **Устранение дублирования кода** - повторяющиеся паттерны выносятся в отдельные функции
- **Улучшение читаемости** - код становится более понятным и поддерживаемым
- **Снижение сложности** - большие функции разбиваются на меньшие, специализированные
- **Увеличение переиспользуемости** - общие функции могут использоваться в разных местах

## 🔍 Выявленные проблемы и решения

### 1. Дублирование расчета выплат (paydayEvents)

**Проблема:** В двух методах `MessageService` дублируется логика суммирования выплат:

```javascript
// Дублируется в sendCombinedRollMovePaydayMessage и sendCombinedRollMoveDealMessage
let totalPayday = 0;
let updatedCash = player.cash;
if (paydayEvents && paydayEvents.length > 0) {
  for (const event of paydayEvents) {
    totalPayday += event.cashFlow;
  }
  updatedCash += totalPayday;
}
```

**Решение:** Создать утилитарную функцию в `MessageService`:

```javascript
/**
 * Рассчитывает суммарные выплаты и обновленный баланс
 * @param {Array} paydayEvents - массив событий выплат
 * @param {number} playerCash - текущий баланс игрока
 * @returns {Object} { totalPayday, updatedCash }
 */
calculatePaydaySummary(paydayEvents, playerCash) {
  let totalPayday = 0;
  let updatedCash = playerCash;

  if (paydayEvents && paydayEvents.length > 0) {
    for (const event of paydayEvents) {
      totalPayday += event.cashFlow;
    }
    updatedCash += totalPayday;
  }

  return { totalPayday, updatedCash };
}
```

### 2. Дублирование проверки текущего игрока

**Проблема:** В 8 функциях `handlers.js` повторяется проверка текущего игрока:

```javascript
const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
if (!currentPlayer || currentPlayer.userId !== userId) {
  await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!');
  return;
}
```

**Решение:** Создать вспомогательную функцию в `handlers.js`:

```javascript
/**
 * Проверяет, является ли пользователь текущим игроком
 * @param {string} gameId - ID игры
 * @param {string} userId - ID пользователя
 * @param {Object} services - объект сервисов
 * @returns {Promise<Object|null>} объект игрока или null
 */
async function validateCurrentPlayer(gameId, userId, services) {
  const { gameService, messageService } = services;

  try {
    const currentPlayer = await gameService.getCurrentPlayer(gameId);

    if (!currentPlayer || currentPlayer.userId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!');
      return null;
    }

    return currentPlayer;
  } catch (error) {
    console.error('Error validating current player:', error);
    await messageService.sendErrorMessage(chatId, 'Ошибка проверки игрока.');
    return null;
  }
}
```

### 3. Дублирование форматирования статистики игрока

**Проблема:** В 4 методах повторяется форматирование финансовой информации игрока:

```javascript
message += `💰 Баланс: ${formatNumber(updatedCash || player.cash)} ₽\n`;
message += `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/мес\n`;
message += `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/мес\n`;
message += `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес\n`;
```

**Решение:** Создать функцию форматирования в `MessageService`:

```javascript
/**
 * Форматирует финансовую статистику игрока
 * @param {Object} player - объект игрока
 * @param {number} cash - опциональный баланс (если отличается от player.cash)
 * @returns {string} отформатированная строка
 */
formatPlayerStats(player, cash = null) {
  const currentCash = cash !== null ? cash : player.cash;

  return `💰 Баланс: ${formatNumber(currentCash)} ₽\n` +
         `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/мес\n` +
         `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/мес\n` +
         `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес\n`;
}
```

### 4. Дублирование обновления финансовых полей игрока

**Проблема:** В `addAsset` и `addLiability` дублируется обновление полей игрока:

```javascript
await gamesCollection.updateOne(
  { gameId },
  { $set: {
    [`players.${playerIndex}.assets`]: newAssets,
    [`players.${playerIndex}.assetsCount`]: newAssetsCount,
    [`players.${playerIndex}.passiveIncome`]: newPassiveIncome,
    [`players.${playerIndex}.totalIncome`]: player.salary + newPassiveIncome,
    [`players.${playerIndex}.cashFlow`]: player.salary + newPassiveIncome - player.totalExpenses
  } }
);
```

**Решение:** Создать унифицированную функцию обновления в `DatabaseService`:

```javascript
/**
 * Обновляет финансовые поля игрока после изменений активов/пассивов
 * @param {string} gameId - ID игры
 * @param {string} userId - ID игрока
 * @param {Object} updates - объект с обновлениями { assets, assetsCount, passiveIncome, totalExpenses, cashFlow }
 */
async updatePlayerFinancialFields(gameId, userId, updates) {
  const gamesCollection = this.getCollection('games');

  // Найти индекс игрока
  const game = await gamesCollection.findOne({ gameId });
  if (!game) return { success: false, error: 'game_not_found' };

  const playerIndex = game.players.findIndex(p => p.userId === userId);
  if (playerIndex === -1) return { success: false, error: 'player_not_found' };

  const player = game.players[playerIndex];

  // Подготовить обновления
  const setUpdates = {};
  Object.keys(updates).forEach(key => {
    setUpdates[`players.${playerIndex}.${key}`] = updates[key];
  });

  // Пересчитать производные поля
  if (updates.passiveIncome !== undefined || updates.totalExpenses !== undefined) {
    const newPassiveIncome = updates.passiveIncome ?? player.passiveIncome;
    const newTotalExpenses = updates.totalExpenses ?? player.totalExpenses;

    setUpdates[`players.${playerIndex}.totalIncome`] = player.salary + newPassiveIncome;
    setUpdates[`players.${playerIndex}.cashFlow`] = player.salary + newPassiveIncome - newTotalExpenses;
  }

  await gamesCollection.updateOne({ gameId }, { $set: setUpdates });

  return { success: true };
}
```

## 🛠️ План рефакторинга handlers.js

### Текущая структура (1080 строк):
```
handlers.js (1080 строк) - монолитный файл
├── handleStart
├── handleHelp
├── handleNewGame
├── handlePlay
├── handleEndGame
├── handleEndGameVote
├── handleRollDice
├── handleCallbackQuery (большой switch с множеством case)
├── handleDealType
├── handleBuyDeal
├── handleSkipDeal
├── handleBuyDealWithCreditCard
├── handleChangeQuantity
├── handleSellStocks
├── handlePayExpenses
├── handleProfile
├── handleStats
├── handleAssets
└── handleCredits
```

### Предлагаемая структура после рефакторинга:

```
src/handlers/
├── index.js              # Главный экспорт (50 строк)
├── commands.js           # Команды бота (150-200 строк)
├── callbacks.js          # Callback-запросы (200-250 строк)
├── deals.js              # Логика сделок (300-350 строк)
└── profile.js            # Профиль и статистика (100-150 строк)
```

### Преимущества:
- **Каждый файл < 350 строк** - улучшенная читаемость
- **Логическая группировка** - связанный код в одном месте
- **Легче тестировать** - изолированные модули
- **Упрощенное сопровождение** - изменения затрагивают меньше кода

### Порядок реализации:
1. Создать папку `src/handlers/`
2. Разделить функции по модулям
3. Создать `index.js` для экспорта
4. Обновить импорты в `main.js`
5. Протестировать функциональность

## 📋 Приоритизация рефакторинга

### Высокий приоритет:
1. **Разделение handlers.js** - решает проблему монолитного файла
2. **Устранение дублирования проверки игрока** - используется в 8 местах
3. **Устранение дублирования форматирования** - используется в 4 местах

### Средний приоритет:
4. **Устранение дублирования paydayEvents** - используется в 2 местах
5. **Унификация обновления финансовых полей** - улучшает поддержку

### Низкий приоритет:
6. **Дополнительные улучшения читаемости** - после основных рефакторингов

## 🎯 Следующие шаги

1. **Начать с разделения handlers.js** - максимальный эффект от рефакторинга
2. **Реализовать утилитарные функции** для устранения дублирования
3. **Добавить модульные тесты** для новых функций
4. **Обновить документацию** после изменений

Хотите приступить к реализации этих улучшений?




Вот конкретный план рефакторинга файла `src/handlers.js` (1080 строк - слишком большой):

## Структура после рефакторинга:

```
src/handlers/
├── index.js              # Главный экспорт
├── commands.js           # Обработчики команд (/start, /help, /newgame, /play, /endgame)
├── callbacks.js          # Обработчик callback_query и основные кнопки
├── deals.js              # Обработчики сделок (buy_deal, skip_deal, etc.)
└── profile.js            # Обработчики профиля (profile, stats, assets, credits)
```

## План рефакторинга:

### 1. Создать папку `src/handlers/`

### 2. Разделить на модули:

**`commands.js`** (150-200 строк):
- `handleStart`
- `handleHelp` 
- `handleNewGame`
- `handlePlay`
- `handleEndGame`
- `handleEndGameVote`

**`callbacks.js`** (200-250 строк):
- `handleCallbackQuery` (только основной switch)
- `handleRollDice`

**`deals.js`** (300-350 строк):
- `handleDealType`
- `handleBuyDeal`
- `handleSkipDeal`
- `handleBuyDealWithCreditCard`
- `handleChangeQuantity`
- `handleSellStocks`
- `handlePayExpenses`

**`profile.js`** (100-150 строк):
- `handleProfile`
- `handleStats`
- `handleAssets`
- `handleCredits`

**`index.js`** (50 строк):
```javascript
const commands = require('./commands');
const callbacks = require('./callbacks');
const deals = require('./deals');
const profile = require('./profile');

module.exports = {
  ...commands,
  ...callbacks,
  ...deals,
  ...profile
};
```

### 3. Обновить импорты в `main.js`:
```javascript
// Было:
const { handleStart, handleHelp, handleNewGame, handlePlay, handleEndGame, handleCallbackQuery } = require('./handlers');

// Станет:
const handlers = require('./handlers');
const { handleStart, handleHelp, handleNewGame, handlePlay, handleEndGame, handleCallbackQuery } = handlers;
```

### 4. Преимущества:
- Каждый файл < 350 строк
- Логическая группировка функций
- Легче поддерживать и тестировать
- Улучшенная читаемость

### 5. Риски:
- Нужно аккуратно переносить импорты (`formatNumber`, `FIELD_TYPES`)
- Тестирование после рефакторинга

Хотите, чтобы я приступил к реализации этого плана рефакторинга?
