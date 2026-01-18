/**
 * Модуль с генераторами сделок для игры Cash Flow
 */

function generateSmallDeal() {
  const deals = [
    {
      type: "small",
      title: "Франшиза пиццерии",
      cost: 1200000, // 150k * 8 месяцев
      cashFlow: 150000,
      description: "Франшиза популярной пиццерии"
    },
    {
      type: "small",
      title: "Франшиза Макдональдс",
      cost: 6800000, // 850k * 8 месяцев
      cashFlow: 850000,
      description: "Франшиза сети быстрого питания"
    },
    {
      type: "small",
      title: "Акции Кока-Кола",
      cost: 160000, // 20k * 8 месяцев
      cashFlow: 20000,
      description: "Акции компании Coca-Cola"
    },
    {
      type: "small",
      title: "Акции IBM",
      cost: 120000, // 15k * 8 месяцев
      cashFlow: 15000,
      description: "Акции компании IBM"
    },
    {
      type: "small",
      title: "Жилой комплекс",
      cost: 800000, // 100k * 8 месяцев
      cashFlow: 100000,
      description: "Многоквартирный жилой дом"
    },
    {
      type: "small",
      title: "Офисное здание",
      cost: 1600000, // 200k * 8 месяцев
      cashFlow: 200000,
      description: "Коммерческое офисное здание"
    },
    {
      type: "small",
      title: "Торговый центр",
      cost: 3200000, // 400k * 8 месяцев
      cashFlow: 400000,
      description: "Крупный торговый комплекс"
    },
    {
      type: "small",
      title: "Складской комплекс",
      cost: 1200000, // 150k * 8 месяцев
      cashFlow: 150000,
      description: "Современный складской комплекс"
    }
  ];
  return deals[Math.floor(Math.random() * deals.length)];
}

function generateBigDeal() {
  const deals = [
    {
      type: "big",
      title: "Инвестиционное партнерство",
      cost: 4000000, // 500k * 8 месяцев
      cashFlow: 500000,
      description: "Прибыльное инвестиционное партнерство"
    },
    {
      type: "big",
      title: "10-квартирный комплекс",
      cost: 6400000, // 800k * 8 месяцев
      cashFlow: 800000,
      description: "Современный жилой комплекс из 10 квартир"
    },
    {
      type: "big",
      title: "Гостиница Плаза",
      cost: 9600000, // 1.2M * 8 месяцев
      cashFlow: 1200000,
      description: "Престижная гостиница в центре города"
    },
    {
      type: "big",
      title: "Офисный комплекс",
      cost: 12000000, // 1.5M * 8 месяцев
      cashFlow: 1500000,
      description: "Крупный деловой центр с офисами"
    },
    {
      type: "big",
      title: "1000 домов",
      cost: 16000000, // 2M * 8 месяцев
      cashFlow: 2000000,
      description: "Масштабный проект с 1000 домами в аренду"
    },
    {
      type: "big",
      title: "Бизнес-центр",
      cost: 8000000, // 1M * 8 месяцев
      cashFlow: 1000000,
      description: "Современный бизнес-центр класса А"
    }
  ];
  const deal = deals[Math.floor(Math.random() * deals.length)];
  deal.downPayment = Math.floor(deal.cost * 0.2); // 20% первоначальный взнос для больших сделок
  return deal
}

module.exports = {
  generateSmallDeal,
  generateBigDeal
};
