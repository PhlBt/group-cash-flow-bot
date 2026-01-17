function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }

  const parsedNum = Number(num);
  if (isNaN(parsedNum)) {
    return '0';
  }

  if (parsedNum >= 1000000) {
    return `${(parsedNum / 1000000).toFixed(1)} млн.`;
  } else if (parsedNum >= 1000) {
    return `${(parsedNum / 1000).toFixed(0)} тыс.`;
  } else {
    return parsedNum.toString();
  }
}

function formatPlayerInfo(player) {
  let info = `👤 ${player.username}\n`;
  info += `💼 Профессия: ${player.profession}\n`;
  info += `💰 Деньги: ${formatNumber(player.cash)} ₽\n`;
  info += `💵 Зарплата: ${formatNumber(player.salary)} ₽/месяц\n`;
  info += `💸 Базовые расходы: ${formatNumber(player.expenses)} ₽/месяц\n`;

  if (player.childrenCount && player.childrenCount > 0) {
    info += `👶 Детей: ${player.childrenCount} (расходы: ${formatNumber(player.childrenExpenses)} ₽/месяц)\n`;
  }

  info += `📈 Пассивный доход: ${formatNumber(player.passiveIncome)} ₽/месяц\n`;
  info += `📊 Общий доход: ${formatNumber(player.totalIncome)} ₽/месяц\n`;
  info += `📉 Общие расходы: ${formatNumber(player.totalExpenses)} ₽/месяц\n`;
  info += `💹 Денежный поток: ${formatNumber(player.cashFlow)} ₽/месяц\n`;
  info += `🏠 Активов: ${player.assetsCount}\n`;
  info += `📋 Пассивов: ${player.liabilitiesCount}\n`;

  // Информация о кредитах
  if (player.loansCount && player.loansCount > 0) {
    info += `💳 Кредитов: ${player.loansCount}\n`;
    info += `📊 Общая сумма кредитов: ${formatNumber(player.totalLoans)} ₽\n`;
    info += `💸 Платежи по кредитам: ${formatNumber(player.totalLoanPayments)} ₽/месяц\n`;
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
    info += `\n💰 Капитал: ${formatNumber(player.fastTrackCash || 0)} ₽`;
    info += `\n💵 Доход: ${formatNumber(player.fastTrackIncome || 0)} ₽/мес`;
    info += `\n🎯 Цель (мечта): ${formatNumber(player.dreamCost || 0)} ₽`;
  }

  return info;
}

function formatCard(card) {
  let text = `📋 ${card.title}\n${card.description}\n`;
  if (card.cost) {
    text += `💰 Стоимость: ${formatNumber(card.cost)} ₽\n`;
  }
  if (card.downPayment) {
    text += `💵 Первый взнос: ${formatNumber(card.downPayment)} ₽\n`;
  }
  if (card.cashFlow) {
    text += `📊 Денежный поток: +${formatNumber(card.cashFlow)} ₽/месяц\n`;
  }
  return text;
}

function formatAssetsForSale(player) {
  return player.assets.map((a, i) =>
    `${i + 1}. ${a.title} - ${formatNumber(a.cost)} ₽ (доход: ${formatNumber(a.passiveIncome)} ₽/мес)`
  ).join('\n');
}

module.exports = {
  formatNumber,
  formatPlayerInfo,
  formatCard,
  formatAssetsForSale
};
