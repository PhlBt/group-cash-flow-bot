// Вспомогательные функции для бота

function formatPlayerInfo(player) {
  let info = `👤 ${player.username}\n`;
  info += `💼 Профессия: ${player.profession}\n`;
  info += `💰 Деньги: $${player.cash}\n`;
  info += `💵 Зарплата: $${player.salary}/месяц\n`;
  info += `💸 Расходы: $${player.expenses}/месяц\n`;
  info += `📈 Пассивный доход: $${player.passiveIncome}/месяц\n`;
  info += `📊 Общий доход: $${player.totalIncome}/месяц\n`;
  info += `📉 Общие расходы: $${player.totalExpenses}/месяц\n`;
  info += `💹 Денежный поток: $${player.cashFlow}/месяц\n`;
  info += `🏠 Активов: ${player.assetsCount}\n`;
  info += `📋 Пассивов: ${player.liabilitiesCount}\n`;

  // Информация о кредитах
  if (player.loansCount && player.loansCount > 0) {
    info += `💳 Кредитов: ${player.loansCount}\n`;
    info += `📊 Общая сумма кредитов: $${player.totalLoans}\n`;
    info += `💸 Платежи по кредитам: $${player.totalLoanPayments}/месяц\n`;
  }

  info += `📍 Позиция: ${player.position + 1}\n`;

  if (player.cashFlow > 0) {
    info += `\n✅ Положительный денежный поток!`;
  } else {
    info += `\n⚠️ Отрицательный денежный поток`;
  }

  if (player.passiveIncome >= player.totalExpenses) {
    info += `\n\n🎉 ВЫ ВЫШЛИ ИЗ КРЫСИНЫХ БЕГОВ!`;
  }

  if (player.inFastTrack) {
    info += `\n\n🚀 FAST TRACK:`;
    info += `\n💰 Капитал: $${player.fastTrackCash || 0}`;
    info += `\n💵 Доход: $${player.fastTrackIncome || 0}/мес`;
    info += `\n🎯 Цель (мечта): $${player.dreamCost || 0}`;
  }

  return info;
}

// Установка глобальных команд меню
async function setupBotCommands(bot) {
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

module.exports = {
  formatPlayerInfo,
  setupBotCommands
};
