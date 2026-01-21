// Определение типов полей игры Cash Flow
const FIELD_TYPES = {
  DEAL: 'deal',                    // Сделка
  MARKET: 'market',                // Рынок
  PAYDAY: 'payday',                // День выплат
  CHARITY: 'charity',              // Благотворительность
  MISCELLANEOUS: 'miscellaneous',  // Всякая всячина
  CHILD: 'child',                  // Ребенок
  DISMISSAL: 'dismissal',          // Увольнение
  INVESTING: 'investing',          // Инвестиция
  LAWSUIT: 'lawsuit',              // Судебный иск
  TAX_AUDIT: 'tax_audit',          // Налоговая проверка
  BAD_PARTNER: 'bad_partner',      // Плохой партнер
  DIVORCE: 'divorce',              // Развод
  UNEXPECTED_REPAIR: 'unexpected_repair', // Неожиданный ремонт
  HEALTH_CARE: 'health_care'       // Забота о здоровье
};

// Первый круг - "Крысиные бега" (24 поля)
const RAT_RACE_FIELDS = [
  { type: FIELD_TYPES.DEAL, name: 'Сделка' },
  { type: FIELD_TYPES.MISCELLANEOUS, name: 'Всякая всячина' },
  { type: FIELD_TYPES.DEAL, name: 'Сделка' },
  { type: FIELD_TYPES.CHARITY, name: 'Благотворительность' },
  { type: FIELD_TYPES.DEAL, name: 'Сделка' },
  { type: FIELD_TYPES.PAYDAY, name: 'День выплат' },
  { type: FIELD_TYPES.DEAL, name: 'Сделка' },
  { type: FIELD_TYPES.MARKET, name: 'Рынок' },
  { type: FIELD_TYPES.DEAL, name: 'Сделка' },
  { type: FIELD_TYPES.MISCELLANEOUS, name: 'Всякая всячина' },
  { type: FIELD_TYPES.DEAL, name: 'Сделка' },
  { type: FIELD_TYPES.DISMISSAL, name: 'Увольнение' },
  { type: FIELD_TYPES.DEAL, name: 'Сделка' },
  { type: FIELD_TYPES.PAYDAY, name: 'День выплат' },
  { type: FIELD_TYPES.DEAL, name: 'Сделка' },
  { type: FIELD_TYPES.MARKET, name: 'Рынок' },
  { type: FIELD_TYPES.DEAL, name: 'Сделка' },
  { type: FIELD_TYPES.MISCELLANEOUS, name: 'Всякая всячина' },
  { type: FIELD_TYPES.DEAL, name: 'Сделка' },
  { type: FIELD_TYPES.CHILD, name: 'Ребенок' },
  { type: FIELD_TYPES.DEAL, name: 'Сделка' },
  { type: FIELD_TYPES.PAYDAY, name: 'День выплат' },
  { type: FIELD_TYPES.DEAL, name: 'Сделка' },
  { type: FIELD_TYPES.MARKET, name: 'Рынок' }
];

// Второй круг - "Быстрый трек" (40 полей)
const FAST_TRACK_FIELDS = [
  { type: FIELD_TYPES.CHARITY, name: 'Благотворительность' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.LAWSUIT, name: 'Судебный иск' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.PAYDAY, name: 'День выплаты' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.TAX_AUDIT, name: 'Налоговая проверка' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.PAYDAY, name: 'День выплаты' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.BAD_PARTNER, name: 'Плохой партнер' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.DIVORCE, name: 'Развод' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.PAYDAY, name: 'День выплаты' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.UNEXPECTED_REPAIR, name: 'Неожиданный ремонт' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.PAYDAY, name: 'День выплаты' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.INVESTING, name: 'Инвестиция' },
  { type: FIELD_TYPES.HEALTH_CARE, name: 'Забота о здоровье' }
];

// Константы для размеров кругов
const RAT_RACE_SIZE = RAT_RACE_FIELDS.length; // 24
const FAST_TRACK_SIZE = FAST_TRACK_FIELDS.length; // 40

module.exports = {
  FIELD_TYPES,
  RAT_RACE_FIELDS,
  FAST_TRACK_FIELDS,
  RAT_RACE_SIZE,
  FAST_TRACK_SIZE
};
