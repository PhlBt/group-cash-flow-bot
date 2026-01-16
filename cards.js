// Генерация случайных карт сделок

function generateSmallDeal() {
  const deals = [
    {
      type: "small",
      title: "Акции",
      cost: Math.floor(Math.random() * 5000) + 1000,
      cashFlow: Math.floor(Math.random() * 200) + 50,
      description: "Инвестиция в акции"
    },
    {
      type: "small",
      title: "Однокомнатная квартира",
      cost: Math.floor(Math.random() * 50000) + 20000,
      cashFlow: Math.floor(Math.random() * 500) + 100,
      description: "Сдача в аренду"
    },
    {
      type: "small",
      title: "Бизнес",
      cost: Math.floor(Math.random() * 30000) + 10000,
      cashFlow: Math.floor(Math.random() * 400) + 150,
      description: "Малый бизнес"
    },
    {
      type: "small",
      title: "Облигации",
      cost: Math.floor(Math.random() * 10000) + 2000,
      cashFlow: Math.floor(Math.random() * 150) + 30,
      description: "Государственные облигации"
    }
  ];
  const deal = deals[Math.floor(Math.random() * deals.length)];
  deal.downPayment = Math.floor(deal.cost * 0.3);
  return deal
}

function generateBigDeal() {
  const deals = [
    {
      type: "big",
      title: "Многоквартирный дом",
      cost: Math.floor(Math.random() * 200000) + 100000,
      cashFlow: Math.floor(Math.random() * 2000) + 500,
      description: "Крупная недвижимость"
    },
    {
      type: "big",
      title: "Крупный бизнес",
      cost: Math.floor(Math.random() * 150000) + 80000,
      cashFlow: Math.floor(Math.random() * 1500) + 400,
      description: "Предприятие"
    },
    {
      type: "big",
      title: "Торговый центр",
      cost: Math.floor(Math.random() * 300000) + 200000,
      cashFlow: Math.floor(Math.random() * 3000) + 1000,
      description: "Коммерческая недвижимость"
    }
  ];
  const deal = deals[Math.floor(Math.random() * deals.length)];
  deal.downPayment = Math.floor(deal.cost * 0.3);
  return deal
}

function generateMarketCard() {
  const markets = [
    {
      type: "market",
      title: "Рынок недвижимости растет",
      description: "Все недвижимые активы удваиваются в цене",
      effect: "double_real_estate",
      skip: true
    },
    {
      type: "market",
      title: "Рынок недвижимости падает",
      description: "Все недвижимые активы теряют 50% стоимости",
      effect: "half_real_estate",
      skip: true
    },
    {
      type: "market",
      title: "Рынок акций падает",
      description: "Все акции теряют 50% стоимости",
      effect: "halve_stocks",
      skip: true
    },
    {
      type: "market",
      title: "Рынок акций растет",
      description: "Все акции активы удваиваются в цене",
      effect: "double_stocks",
      skip: true
    },
    {
      type: "market",
      title: "Инфляция",
      description: "Все расходы увеличиваются на 10%",
      effect: "increase_expenses",
      skip: true
    },
    {
      type: "market",
      title: "Экономический рост",
      description: "Все доходы увеличиваются на 10%",
      effect: "increase_income",
      skip: true
    },
    {
      type: "market",
      title: "Бонус",
      description: "Получите бонус в размере месячной зарплаты",
      effect: "salary_bonus",
      skip: true
    }
  ];
  return markets[Math.floor(Math.random() * markets.length)];
}

function generateOpportunityCard() {
  const opportunities = [
    {
      type: "opportunity",
      title: "Случайная сделка",
      description: "Вы получаете случайную сделку",
      effect: "random_deal",
      skip: true
    },
    {
      type: "opportunity",
      title: "Дополнительный ход",
      description: "Бросьте кубик еще раз",
      effect: "extra_turn",
      skip: true
    },
    {
      type: "opportunity",
      title: "Налоговый вычет",
      description: "Получите 1000$",
      effect: "tax_refund",
      skip: true
    }
  ];
  return opportunities[Math.floor(Math.random() * opportunities.length)];
}

function generateDoodadCard() {
  const doodads = [
    {
      type: "doodad",
      title: "Покупка автомобиля",
      cost: Math.floor(Math.random() * 10000) + 5000,
      description: "Новый автомобиль"
    },
    {
      type: "doodad",
      title: "Отпуск",
      cost: Math.floor(Math.random() * 5000) + 2000,
      description: "Путешествие"
    },
    {
      type: "doodad",
      title: "Ремонт",
      cost: Math.floor(Math.random() * 8000) + 3000,
      description: "Ремонт дома"
    },
    {
      type: "doodad",
      title: "Подарок",
      cost: Math.floor(Math.random() * 3000) + 1000,
      description: "Дорогой подарок"
    }
  ];
  return doodads[Math.floor(Math.random() * doodads.length)];
}

module.exports = {
  generateSmallDeal,
  generateBigDeal,
  generateMarketCard,
  generateOpportunityCard,
  generateDoodadCard
};
