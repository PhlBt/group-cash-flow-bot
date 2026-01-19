Я проанализировал проект и нашел несколько ситуаций дублирования кода:

## 🔍 **Найденные дублирования кода:**

### 1. **Дублирование суммирования paydayEvents** 
**Где:** `sendCombinedRollMovePaydayMessage` и `sendCombinedRollMoveDealMessage` в `messageService.js`

```javascript
let totalPayday = 0;
let updatedCash = player.cash;
if (paydayEvents && paydayEvents.length > 0) {
  for (const event of paydayEvents) {
    totalPayday += event.cashFlow;
  }
  updatedCash += totalPayday;
  // ... остальной код
}
```

### 2. **Дублирование проверки текущего игрока**
**Где:** 8 функций в `handlers.js` (handleDealType, handleBuyDeal, handleSkipDeal, handleChangeQuantity, handleSellStocks, handlePayExpenses)

```javascript
const currentPlayer = await gameService.getCurrentPlayer(game.gameId);
if (!currentPlayer || currentPlayer.userId !== userId) {
  await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!');
  return;
}
```

### 3. **Дублирование форматирования информации об игроке**
**Где:** `sendPlayerCard`, `sendPlayerTurnMessage`, `sendCombinedRollMovePaydayMessage`, `sendCombinedRollMoveDealMessage`

```javascript
message += `💰 Баланс: ${formatNumber(updatedCash || player.cash)} ₽\n`;
message += `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/мес\n`;
message += `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/мес\n`;
message += `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/мес\n`;
```

### 4. **Дублирование обновления полей игрока**
**Где:** `addAsset` и `addLiability` в `databaseService.js`

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

## 💡 **Рекомендации по рефакторингу:**

1. **Вынести `calculatePaydaySummary(paydayEvents, playerCash)`** - метод для расчета выплат
2. **Создать `validateCurrentPlayer(gameId, userId)`** - валидация текущего игрока  
3. **Вынести `formatPlayerStats(player, cash = null)`** - форматирование статистики игрока
4. **Создать `updatePlayerFinancialFields(gameId, userId, updates)`** - унифицированное обновление полей

Хотите, чтобы я реализовал эти улучшения?