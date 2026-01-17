// Генерация случайных карт сделок
const { formatNumber } = require('../utils/formatters');

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
  const deal = deals[Math.floor(Math.random() * deals.length)];
  deal.downPayment = Math.floor(deal.cost * 0.2); // 20% первоначальный взнос
  return deal
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

function generateMarketCard() {
  // 60% - экономические события, 40% - торговые предложения
  const isEconomicEvent = Math.random() < 0.6;

  if (isEconomicEvent) {
    // Экономические события - влияют на всех игроков автоматически
    const economicEvents = [
      {
        type: "market",
        subtype: "economic",
        title: "Рынок недвижимости растет",
        description: "Все недвижимые активы удваиваются в цене",
        effect: "double_real_estate",
        skip: true
      },
      {
        type: "market",
        subtype: "economic",
        title: "Рынок недвижимости падает",
        description: "Все недвижимые активы теряют 50% стоимости",
        effect: "half_real_estate",
        skip: true
      },
      {
        type: "market",
        subtype: "economic",
        title: "Рынок акций падает",
        description: "Все акции теряют 50% стоимости",
        effect: "halve_stocks",
        skip: true
      },
      {
        type: "market",
        subtype: "economic",
        title: "Рынок акций растет",
        description: "Все акции удваиваются в цене",
        effect: "double_stocks",
        skip: true
      },
      {
        type: "market",
        subtype: "economic",
        title: "Инфляция",
        description: "Все расходы увеличиваются на 10%",
        effect: "increase_expenses",
        skip: true
      },
      {
        type: "market",
        subtype: "economic",
        title: "Экономический рост",
        description: "Все доходы увеличиваются на 10%",
        effect: "increase_income",
        skip: true
      },
      {
        type: "market",
        subtype: "economic",
        title: "Финансовый кризис",
        description: "Все пассивные доходы уменьшаются на 20%",
        effect: "decrease_passive_income",
        skip: true
      },
      {
        type: "market",
        subtype: "economic",
        title: "Бум технологий",
        description: "Все пассивные доходы увеличиваются на 15%",
        effect: "increase_passive_income",
        skip: true
      }
    ];
    return economicEvents[Math.floor(Math.random() * economicEvents.length)];
  } else {
    // Торговые предложения - конкретный актив с выбором купить/продать
    const tradeTypes = [
      {
        assetType: "real_estate",
        title: "Рыночное предложение: Недвижимость",
        basePriceRange: [300000, 800000], // ₽300k - ₽800k
        priceMultiplier: 0.8 + Math.random() * 0.4, // 0.8 - 1.2
        skip: false
      },
      {
        assetType: "stocks",
        title: "Рыночное предложение: Акции",
        basePriceRange: [150000, 400000], // ₽150k - ₽400k
        priceMultiplier: 0.7 + Math.random() * 0.6, // 0.7 - 1.3
        skip: false
      },
      {
        assetType: "business",
        title: "Рыночное предложение: Бизнес",
        basePriceRange: [500000, 1500000], // ₽500k - ₽1.5M
        priceMultiplier: 0.75 + Math.random() * 0.5, // 0.75 - 1.25
        skip: false
      }
    ];

    const tradeType = tradeTypes[Math.floor(Math.random() * tradeTypes.length)];

    // Генерируем конкретный актив с плавающей ценой
    const basePrice = Math.floor(Math.random() * (tradeType.basePriceRange[1] - tradeType.basePriceRange[0])) + tradeType.basePriceRange[0];
    const baseIncome = Math.floor(basePrice * 0.08 / 100) * 100; // ~8% годовых

    const tradeCard = {
      type: "market",
      subtype: "trade",
      title: tradeType.title,
      assetType: tradeType.assetType,
      priceMultiplier: tradeType.priceMultiplier,
      skip: false,
      // Конкретный актив для предложения
      asset: {
        title: generateAssetTitle(tradeType.assetType),
        cost: Math.floor(basePrice * tradeType.priceMultiplier),
        cashFlow: baseIncome,
        type: tradeType.assetType === "stocks" ? "small" : "big"
      }
    };

    // Формируем описание с вариантами действий
    tradeCard.description = `🏢 ${tradeCard.asset.title}\n💰 Стоимость: ${formatNumber(tradeCard.asset.cost)} ₽\n📈 Доход: ${formatNumber(tradeCard.asset.cashFlow)} ₽/мес\n\nВы можете купить этот актив или продать его (если он у вас есть).`;

    return tradeCard;
  }
}

// Генерация названия актива
function generateAssetTitle(assetType) {
  const titles = {
    new_investment: [
      "Сеть автомоек", "Фитнес-клуб", "Кафе быстрого питания", "Магазин электроники",
      "Строительная компания", "Туристическое агентство", "Салон красоты", "Авторемонтная мастерская"
    ],
    new_stocks: [
      "Акции Газпрома", "Акции Сбербанка", "Акции Роснефти", "Акции Лукойла",
      "Акции Яндекса", "Акции Mail.ru", "Акции Тинькофф", "Акции ВТБ"
    ]
  };

  const titleList = titles[assetType] || ["Новый актив"];
  return titleList[Math.floor(Math.random() * titleList.length)];
}

function generateOpportunityCard() {
  const opportunities = [
    {
      type: "opportunity",
      title: "Выигрыш в лотерею",
      description: `Вы выиграли в лотерею. Получите ${formatNumber(100000)} ₽`,
      effect: "lottery_win",
    },
    {
      type: "opportunity",
      title: "Коллективный иск",
      description: `Вы выиграли коллективный судебный процесс. Получите ${formatNumber(500000)} ₽`,
      effect: "lawsuit_win",
    },
    {
      type: "opportunity",
      title: "Наследство",
      description: `Вы получили наследство от дальнего родственника. Получите ${formatNumber(2000000)} ₽`,
      effect: "inheritance",
    },
    {
      type: "opportunity",
      title: "Автокатастрофа",
      description: `Вы попали в аварию. Заплатите ${formatNumber(150000)} ₽ за ремонт`,
      effect: "car_accident",
    },
    {
      type: "opportunity",
      title: "Операция",
      description: `Необходима срочная операция. Заплатите ${formatNumber(200000)} ₽`,
      effect: "surgery",
    },
    {
      type: "opportunity",
      title: "Ремонт дома",
      description: `Капитальный ремонт дома. Заплатите ${formatNumber(250000)} ₽`,
      effect: "home_improvement",
    }
  ];
  return opportunities[Math.floor(Math.random() * opportunities.length)];
}

function generateDoodadCard() {
  // Генерируем расходы в зависимости от зарплаты игрока
  // Максимум = 1.5 × месячная зарплата (для реализма)
  const salaryRanges = [
    { maxSalary: 150000, maxExpense: 150000 }, // Уборщик
    { maxSalary: 400000, maxExpense: 300000 }, // Медсестра-Учитель
    { maxSalary: 500000, maxExpense: 400000 }, // Бухгалтер
    { maxSalary: 600000, maxExpense: 500000 }  // Менеджер
  ];

  // Получаем текущего игрока для расчета расходов
  // Пока используем среднее значение для генерации
  const maxExpense = 250000; // Среднее значение для баланса

  const doodads = [
    // Транспорт (низкие расходы)
    {
      type: "doodad",
      title: "Бензин и обслуживание",
      cost: Math.floor(Math.random() * 30000) + 15000,
      description: "Топливо и техобслуживание автомобиля"
    },
    {
      type: "doodad",
      title: "Штраф за парковку",
      cost: Math.floor(Math.random() * 10000) + 3000,
      description: "Нарушение правил парковки"
    },
    {
      type: "doodad",
      title: "Ремонт автомобиля",
      cost: Math.floor(Math.random() * 80000) + 20000,
      description: "Неожиданная поломка машины"
    },

    // Жилье и коммуналка (средние расходы)
    {
      type: "doodad",
      title: "Коммунальные услуги",
      cost: Math.floor(Math.random() * 25000) + 10000,
      description: "Неожиданно высокий счет за коммуналку"
    },
    {
      type: "doodad",
      title: "Покупка мебели",
      cost: Math.floor(Math.random() * 100000) + 30000,
      description: "Новая мебель для дома"
    },
    {
      type: "doodad",
      title: "Ремонт дома",
      cost: Math.floor(Math.random() * 150000) + 50000,
      description: "Капитальный ремонт жилья"
    },

    // Здоровье (средние расходы)
    {
      type: "doodad",
      title: "Визит к врачу",
      cost: Math.floor(Math.random() * 20000) + 8000,
      description: "Медицинская консультация"
    },
    {
      type: "doodad",
      title: "Лекарства",
      cost: Math.floor(Math.random() * 15000) + 5000,
      description: "Необходимые медикаменты"
    },
    {
      type: "doodad",
      title: "Стоматолог",
      cost: Math.floor(Math.random() * 30000) + 10000,
      description: "Лечение зубов"
    },

    // Семья и дети (низкие-средние расходы)
    {
      type: "doodad",
      title: "Подарки на день рождения",
      cost: Math.floor(Math.random() * 20000) + 8000,
      description: "Подарки для семьи и друзей"
    },
    {
      type: "doodad",
      title: "Одежда для детей",
      cost: Math.floor(Math.random() * 25000) + 10000,
      description: "Школьная форма и одежда"
    },
    {
      type: "doodad",
      title: "Детский сад/школа",
      cost: Math.floor(Math.random() * 15000) + 5000,
      description: "Оплата образования"
    },

    // Развлечения и отдых (средние расходы)
    {
      type: "doodad",
      title: "Ресторан",
      cost: Math.floor(Math.random() * 15000) + 5000,
      description: "Ужин в ресторане"
    },
    {
      type: "doodad",
      title: "Кино и развлечения",
      cost: Math.floor(Math.random() * 10000) + 3000,
      description: "Развлекательные мероприятия"
    },
    {
      type: "doodad",
      title: "Отпуск",
      cost: Math.floor(Math.random() * 200000) + 50000,
      description: "Семейный отдых"
    },

    // Неожиданные расходы (низкие расходы)
    {
      type: "doodad",
      title: "Потерянный кошелек",
      cost: Math.floor(Math.random() * 10000) + 5000,
      description: "Замена документов и денег"
    },
    {
      type: "doodad",
      title: "Сломанная техника",
      cost: Math.floor(Math.random() * 30000) + 8000,
      description: "Ремонт бытовой техники"
    },
    {
      type: "doodad",
      title: "Пропажа вещей",
      cost: Math.floor(Math.random() * 20000) + 5000,
      description: "Замена потерянных вещей"
    },

    // Страховка и налоги (низкие-средние расходы)
    {
      type: "doodad",
      title: "Страховые взносы",
      cost: Math.floor(Math.random() * 12000) + 4000,
      description: "Оплата страховки"
    },
    {
      type: "doodad",
      title: "Налоги",
      cost: Math.floor(Math.random() * 30000) + 10000,
      description: "Неожиданные налоговые платежи"
    },
    {
      type: "doodad",
      title: "Банковские комиссии",
      cost: Math.floor(Math.random() * 5000) + 1000,
      description: "Комиссии и обслуживание"
    },

    // Еда и бытовые нужды (низкие расходы)
    {
      type: "doodad",
      title: "Продукты на неделю",
      cost: Math.floor(Math.random() * 8000) + 3000,
      description: "Покупка продуктов"
    },
    {
      type: "doodad",
      title: "Кафе и фастфуд",
      cost: Math.floor(Math.random() * 6000) + 2000,
      description: "Обеды вне дома"
    },
    {
      type: "doodad",
      title: "Косметика и уход",
      cost: Math.floor(Math.random() * 10000) + 3000,
      description: "Средства личной гигиены"
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
