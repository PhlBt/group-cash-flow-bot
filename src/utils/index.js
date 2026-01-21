/**
 * Форматирует число с разделителями разрядов или краткими формами
 * @param {number} num - Число для форматирования
 * @returns {string} Отформатированное число с ₽
 */
function formatNumber(num) {
  // Проверка на корректное число
  if (typeof num !== 'number' || isNaN(num)) {
    return '0';
  }

  // Округляем до целого для избежания плавающей точки
  num = Math.round(num);

  if (num >= 1000000) {
    // Для миллионов: показываем с десятичными
    const millions = (num / 1000000).toFixed(1);
    return millions + ' млн';
  } else if (num % 1000 === 0 && num >= 1000) {
    // Для круглых тысяч: показываем как "X тыс ₽"
    const thousands = num / 1000;
    return thousands + ' тыс';
  } else {
    // Для остальных чисел: показываем с пробелами и "₽"
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
}

/**
 * Применяет inflation к ценовым полям карточки
 * @param {Object} card - Карточка (deal, miscellaneous, market)
 * @param {number} inflation - Коэффициент inflation
 * @returns {Object} Карточка с примененными ценами
 */
function applyInflation(card, inflation) {
  const inflatedCard = { ...card };

  // Поля с ценами для умножения на inflation
  const priceFields = ['cost', 'mortgage', 'downPayment', 'passiveIncome', 'expenses', 'apartmentCost'];

  priceFields.forEach(field => {
    if (inflatedCard[field] !== undefined && typeof inflatedCard[field] === 'number') {
      inflatedCard[field] = Math.round(inflatedCard[field] * inflation);
    }
  });

  return inflatedCard;
}

const RateLimiter = require('./rateLimiter');
const { initializeDealCirculation, processDealAction, circulateToNextPlayer, endDealCirculation, initializeCanSellStocksCirculation, processCanSellStocksAction } = require('./dealCirculation');

module.exports = {
  formatNumber,
  applyInflation,
  RateLimiter,
  initializeDealCirculation,
  processDealAction,
  circulateToNextPlayer,
  endDealCirculation,
  initializeCanSellStocksCirculation,
  processCanSellStocksAction
};
