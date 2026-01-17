/**
 * Форматирует число с разделителями разрядов или краткими формами
 * @param {number} num - Число для форматирования
 * @returns {string} Отформатированное число
 */
function formatNumber(num) {
  if (num % 1000000 === 0 && num >= 1000000) {
    return (num / 1000000) + ' млн';
  } else if (num % 1000 === 0 && num >= 1000) {
    return (num / 1000) + ' тыс';
  } else {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
}

module.exports = {
  formatNumber
};
