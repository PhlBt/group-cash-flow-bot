const PROFESSIONS = [
  {
    name: "Уборщик",
    salary: 120000,
    expenses: 100000,
    savings: 100000,
    description: "Низкооплачиваемая работа"
  },
  {
    name: "Медсестра",
    salary: 340000,
    expenses: 270000,
    savings: 200000,
    description: "Медицинский работник"
  },
  {
    name: "Учитель",
    salary: 350000,
    expenses: 280000,
    savings: 210000,
    description: "Педагогическая деятельность"
  },
  {
    name: "Механик",
    salary: 400000,
    expenses: 310000,
    savings: 250000,
    description: "Автомобильный ремонт"
  },
  {
    name: "Полицейский",
    salary: 420000,
    expenses: 320000,
    savings: 280000,
    description: "Служба в полиции"
  },
  {
    name: "Бухгалтер",
    salary: 500000,
    expenses: 370000,
    savings: 350000,
    description: "Финансовый учет"
  },
  {
    name: "Продавец",
    salary: 480000,
    expenses: 360000,
    savings: 330000,
    description: "Работа в розничной торговле"
  },
  {
    name: "Менеджер",
    salary: 550000,
    expenses: 400000,
    savings: 400000,
    description: "Управление бизнесом"
  }
];

function getRandomProfession() {
  return PROFESSIONS[Math.floor(Math.random() * PROFESSIONS.length)];
}

function getAllProfessions() {
  return PROFESSIONS;
}

module.exports = {
  PROFESSIONS,
  getRandomProfession,
  getAllProfessions
};