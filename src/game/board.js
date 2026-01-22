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
  EXPENSES: 'expenses',            // Расходы
  DREAM: 'dream',                  // Мечта
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

// Второй круг - "Быстрый трек" (46 полей)
const { createFastTrackFields } = require('./cards/fastTrack');
const FAST_TRACK_FIELDS = createFastTrackFields(FIELD_TYPES);

// Константы для размеров кругов
const RAT_RACE_SIZE = RAT_RACE_FIELDS.length; // 24
const FAST_TRACK_SIZE = FAST_TRACK_FIELDS.length; // 46

module.exports = {
  FIELD_TYPES,
  RAT_RACE_FIELDS,
  FAST_TRACK_FIELDS,
  RAT_RACE_SIZE,
  FAST_TRACK_SIZE
};
