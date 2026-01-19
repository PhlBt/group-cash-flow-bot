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

module.exports = {
  formatNumber
};
