const PROFESSIONS = [
  {
    name: 'Врач',
    salary: 396000,
    passiveIncome: 0,
    totalExpenses: 289500,
    cashFlow: 106500,
    savings: 12000,
    kidCost: 19200,
    credits: [
      {
        title: 'Ипотека на дом',
        cost: 6060000,
        monthlyPayment: 57000
      },
      {
        title: 'Кредит на образование',
        cost: 4500000,
        monthlyPayment: 22500
      },
      {
        title: 'Кредит на автомобиль',
        cost: 570000,
        monthlyPayment: 11400
      },
      {
        title: 'По кредитным картам',
        cost: 270000,
        monthlyPayment: 8100
      },
      {
        title: 'Розничный долг',
        cost: 30000,
        monthlyPayment: 1500
      }
    ]
  },
  {
    name: 'Офицер полиции',
    salary: 90000,
    passiveIncome: 0,
    totalExpenses: 56400,
    cashFlow: 33600,
    savings: 15600,
    kidCost: 4800,
    credits: [
      {
        title: 'Кредит на образование',
        cost: 150000,
        monthlyPayment: 0
      },
      {
        title: 'Кредит на автомобиль',
        cost: 1380000,
        monthlyPayment: 3000
      },
      {
        title: 'Розничный долг',
        cost: 30000,
        monthlyPayment: 1500
      }
    ]
  },
  {
    name: 'Водитель грузовика',
    salary: 75000,
    passiveIncome: 0,
    totalExpenses: 48600,
    cashFlow: 26400,
    savings: 22500,
    kidCost: 4200,
    credits: [
      {
        title: 'Ипотека на дом',
        cost: 1140000,
        monthlyPayment: 12000
      },
      {
        title: 'Кредит на автомобиль',
        cost: 120000,
        monthlyPayment: 2400
      },
      {
        title: 'По кредитным картам',
        cost: 60000,
        monthlyPayment: 1800
      },
      {
        title: 'Розничный долг',
        cost: 30000,
        monthlyPayment: 1500
      }
    ]
  },
  {
    name: 'Конструктор',
    salary: 147000,
    passiveIncome: 0,
    totalExpenses: 96300,
    cashFlow: 50700,
    savings: 12000,
    kidCost: 7500,
    credits: [
      {
        title: 'Ипотека на дом',
        cost: 210000,
        monthlyPayment: 21000
      },
      {
        title: 'Кредит на образование',
        cost: 120000,
        monthlyPayment: 1800
      },
      {
        title: 'Кредит на автомобиль',
        cost: 2250000,
        monthlyPayment: 4200
      },
      {
        title: 'По кредитным картам',
        cost: 360000,
        monthlyPayment: 3600
      },
      {
        title: 'Розничный долг',
        cost: 30000,
        monthlyPayment: 1500
      }
    ]
  },
  {
    name: 'Адвокат',
    salary: 225000,
    passiveIncome: 0,
    totalExpenses: 162600,
    cashFlow: 62400,
    savings: 12000,
    kidCost: 19200,
    credits: [
      {
        title: 'Ипотека на дом',
        cost: 3450000,
        monthlyPayment: 33000
      },
      {
        title: 'Кредит на образование',
        cost: 2340000,
        monthlyPayment: 11700
      },
      {
        title: 'Кредит на автомобиль',
        cost: 330000,
        monthlyPayment: 6600
      },
      {
        title: 'По кредитным картам',
        cost: 180000,
        monthlyPayment: 5400
      },
      {
        title: 'Розничный долг',
        cost: 30000,
        monthlyPayment: 1500
      }
    ]
  },
  {
    name: 'Офис менеджер',
    salary: 138000,
    passiveIncome: 0,
    totalExpenses: 87900,
    cashFlow: 50100,
    savings: 12000,
    kidCost: 7200,
    credits: [
      {
        title: 'Ипотека на дом',
        cost: 180000,
        monthlyPayment: 21000
      },
      {
        title: 'Кредит на образование',
        cost: 90000,
        monthlyPayment: 1800
      },
      {
        title: 'Кредит на автомобиль',
        cost: 2250000,
        monthlyPayment: 3600
      },
      {
        title: 'По кредитным картам',
        cost: 360000,
        monthlyPayment: 2700
      },
      {
        title: 'Розничный долг',
        cost: 30000,
        monthlyPayment: 1500
      }
    ]
  },
  {
    name: 'Пилот',
    salary: 285000,
    passiveIncome: 0,
    totalExpenses: 207000,
    cashFlow: 78000,
    savings: 12000,
    kidCost: 14400,
    credits: [
      {
        title: 'Ипотека на дом',
        cost: 4290000,
        monthlyPayment: 39900
      },
      {
        title: 'Кредит на автомобиль',
        cost: 450000,
        monthlyPayment: 9000
      },
      {
        title: 'По кредитным картам',
        cost: 660000,
        monthlyPayment: 19800
      },
      {
        title: 'Розничный долг',
        cost: 30000,
        monthlyPayment: 1500
      }
    ]
  },
  {
    name: 'Учитель',
    salary: 99000,
    passiveIncome: 0,
    totalExpenses: 65700,
    cashFlow: 33300,
    savings: 12000,
    kidCost: 5400,
    credits: [
      {
        title: 'Ипотека на дом',
        cost: 150000,
        monthlyPayment: 15000
      },
      {
        title: 'Кредит на образование',
        cost: 90000,
        monthlyPayment: 1800
      },
      {
        title: 'Кредит на автомобиль',
        cost: 1500000,
        monthlyPayment: 3000
      },
      {
        title: 'По кредитным картам',
        cost: 360000,
        monthlyPayment: 2700
      },
      {
        title: 'Розничный долг',
        cost: 30000,
        monthlyPayment: 1500
      }
    ]
  },
  {
    name: 'Секретарь',
    salary: 75000,
    passiveIncome: 0,
    totalExpenses: 48600,
    cashFlow: 26400,
    savings: 21300,
    kidCost: 4200,
    credits: [
      {
        title: 'Ипотека на дом',
        cost: 1140000,
        monthlyPayment: 12000
      },
      {
        title: 'Кредит на автомобиль',
        cost: 120000,
        monthlyPayment: 2400
      },
      {
        title: 'По кредитным картам',
        cost: 60000,
        monthlyPayment: 1800
      },
      {
        title: 'Розничный долг',
        cost: 30000,
        monthlyPayment: 1500
      }
    ]
  },
  {
    name: 'Медсестра',
    salary: 93000,
    passiveIncome: 0,
    totalExpenses: 59400,
    cashFlow: 33600,
    savings: 14400,
    kidCost: 5100,
    credits: [
      {
        title: 'Ипотека на дом',
        cost: 150000,
        monthlyPayment: 12000
      },
      {
        title: 'Кредит на образование',
        cost: 90000,
        monthlyPayment: 900
      },
      {
        title: 'Кредит на автомобиль',
        cost: 1410000,
        monthlyPayment: 3000
      },
      {
        title: 'По кредитным картам',
        cost: 180000,
        monthlyPayment: 2700
      },
      {
        title: 'Розничный долг',
        cost: 30000,
        monthlyPayment: 1500
      }
    ]
  },
  {
    name: 'Механик',
    salary: 60000,
    passiveIncome: 0,
    totalExpenses: 38400,
    cashFlow: 21600,
    savings: 20100,
    kidCost: 3300,
    credits: [
      {
        title: 'Ипотека на дом',
        cost: 930000,
        monthlyPayment: 9000
      },
      {
        title: 'Кредит на автомобиль',
        cost: 90000,
        monthlyPayment: 1800
      },
      {
        title: 'По кредитным картам',
        cost: 60000,
        monthlyPayment: 1800
      },
      {
        title: 'Розничный долг',
        cost: 30000,
        monthlyPayment: 1500
      }
    ]
  },
  {
    name: 'Швейцар',
    salary: 48000,
    passiveIncome: 0,
    totalExpenses: 28500,
    cashFlow: 19500,
    savings: 12000,
    kidCost: 2100,
    credits: [
      {
        title: 'Ипотека на дом',
        cost: 6060000,
        monthlyPayment: 6000
      },
      {
        title: 'Кредит на образование',
        cost: 4500000,
        monthlyPayment: 0
      },
      {
        title: 'Кредит на автомобиль',
        cost: 570000,
        monthlyPayment: 1800
      },
      {
        title: 'По кредитным картам',
        cost: 270000,
        monthlyPayment: 1800
      },
      {
        title: 'Розничный долг',
        cost: 30000,
        monthlyPayment: 1500
      }
    ]
  }
];

const getRandomProfession = () => PROFESSIONS[Math.floor(Math.random() * PROFESSIONS.length)]

module.exports = { getRandomProfession }
