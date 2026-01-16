const PROFESSIONS = [
  {
    name: "Дворник",
    salary: 1000,
    expenses: 800,
    savings: 100,
    description: "Низкая зарплата, но и низкие расходы"
  },
  {
    name: "Медсестра",
    salary: 3100,
    expenses: 2420,
    savings: 680,
    description: "Стабильная работа в медицине"
  },
  {
    name: "Учитель",
    salary: 3200,
    expenses: 2590,
    savings: 610,
    description: "Работа в образовании"
  },
  {
    name: "Инженер",
    salary: 4600,
    expenses: 3390,
    savings: 1210,
    description: "Техническая специальность"
  },
  {
    name: "Менеджер",
    salary: 5000,
    expenses: 3680,
    savings: 1320,
    description: "Управленческая позиция"
  },
  {
    name: "Врач",
    salary: 13200,
    expenses: 9650,
    savings: 3550,
    description: "Высокооплачиваемая профессия"
  },
  {
    name: "Пилот",
    salary: 9500,
    expenses: 7300,
    savings: 2200,
    description: "Работа в авиации"
  },
  {
    name: "Адвокат",
    salary: 7500,
    expenses: 5420,
    savings: 2080,
    description: "Юридическая практика"
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
