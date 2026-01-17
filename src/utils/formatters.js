function formatPlayerInfo(player) {
  let info = `👤 ${player.username}\n`;
  info += `💼 Профессия: ${player.profession}\n`;
  info += `💰 Деньги: ₽${player.cash}\n`;
  info += `💵 Зарплата: ₽${player.salary}/месяц\n`;
  info += `💸 Базовые расходы: ₽${player.expenses}/месяц\n`;

  if (player.childrenCount && player.childrenCount > 0) {
    info += `👶 Детей: ${player.childrenCount} (расходы: ₽${player.childrenExpenses}/месяц)\n`;
  }

  info += `📈 Пассивный доход: ₽${player.passiveIncome}/месяц\n`;
  info += `📊 Общий доход: ₽${player.totalIncome}/месяц\n`;
  info += `📉 Общие расходы: ₽${player.totalExpenses}/месяц\n`;
  info += `💹 Денежный поток: ₽${player.cashFlow}/месяц\n`;
  info += `🏠 Активов: ${player.assetsCount}\n`;
  info += `📋 Пассивов: ${player.liabilitiesCount}\n`;

  // Информация о кредитах
  if (player.loansCount && player.loansCount > 0) {
    info += `💳 Кредитов: ${player.loansCount}\n`;
    info += `📊 Общая сумма кредитов: ₽${player.totalLoans}\n`;
    info += `💸 Платежи по кредитам: ₽${player.totalLoanPayments}/месяц\n`;
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
    info += `\n\n🚀 СКОРОСТНАЯ ДОРОЖКА:`;
    info += `\n💰 Капитал: ₽${player.fastTrackCash || 0}`;
    info += `\n💵 Доход: ₽${player.fastTrackIncome || 0}/мес`;
    info += `\n🎯 Цель (мечта): ₽${player.dreamCost || 0}`;
  }

  return info;
}

function formatCard(card) {
  let text = `📋 ${card.title}\n${card.description}\n`;
  if (card.cost) {
    text += `💰 Стоимость: $${card.cost}\n`;
  }
  if (card.downPayment) {
    text += `💵 Первый взнос: $${card.downPayment}\n`;
  }
  if (card.cashFlow) {
    text += `📊 Денежный поток: +$${card.cashFlow}/месяц\n`;
  }
  return text;
}

function formatAssetsForSale(player) {
  return player.assets.map((a, i) =>
    `${i + 1}. ${a.title} - $${a.cost} (доход: $${a.passiveIncome}/мес)`
  ).join('\n');
}

module.exports = {
  formatPlayerInfo,
  formatCard,
  formatAssetsForSale
};
