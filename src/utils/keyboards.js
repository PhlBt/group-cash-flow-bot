/**
 * Модуль с клавиатурами для Telegram бота
 */

/**
 * Клавиатура для приветственного сообщения /start
 */
const welcomeKeyboard = {
  inline_keyboard: [
    [
      { text: '🎮 Играть!', callback_data: 'play' }
    ],
    [
      { text: '📋 Правила игры', callback_data: 'rules' },
      { text: '❓ Помощь', callback_data: 'help' }
    ]
  ]
};

/**
 * Клавиатура для голосования за окончание игры
 */
const endGameVoteKeyboard = {
  inline_keyboard: [
    [
      { text: '🛑 Завершить игру', callback_data: 'end_game_vote' }
    ]
  ]
};

/**
 * Клавиатура для комнаты ожидания
 */
const waitingRoomKeyboard = {
  inline_keyboard: [
    [
      { text: '🎮 Играть!', callback_data: 'play' }
    ],
    [
      { text: '📋 Правила игры', callback_data: 'rules' },
      { text: '❓ Помощь', callback_data: 'help' }
    ],
    [
      { text: '🚀 Начать игру', callback_data: 'start_game' }
    ]
  ]
};

/**
 * Основная игровая клавиатура (обычный режим)
 */
const gameKeyboard = {
  inline_keyboard: [
    [
      { text: '🎲 Бросить кубик', callback_data: 'roll_dice' }
    ],
    [
      { text: '👤 Профиль', callback_data: 'profile' },
      { text: '📊 Статистика', callback_data: 'stats' }
    ]
  ]
};

/**
 * Клавиатура при эффекте благотворительности
 */
const charityKeyboard = {
  inline_keyboard: [
    [
      { text: '🎲 Бросить кубик', callback_data: 'roll_dice_1' },
      { text: '🎲 Бросить 2 кубика', callback_data: 'roll_dice_2' }
    ],
    [
      { text: '👤 Профиль', callback_data: 'profile' },
      { text: '📊 Статистика', callback_data: 'stats' }
    ]
  ]
};

/**
 * Клавиатура выбора типа сделки
 */
const dealTypeKeyboard = {
  inline_keyboard: [
    [
      { text: '💼 Мелкая сделка', callback_data: 'small_deal' }
    ],
    [
      { text: '🏢 Крупная сделка', callback_data: 'big_deal' }
    ]
  ]
};

/**
 * Генерирует клавиатуру для карточки сделки
 * @param {Object} deal - Объект сделки
 * @param {Object} player - Объект игрока
 * @param {Object} game - Объект игры
 * @param {number} quantity - Текущее количество для unlimitedStocks (опционально)
 * @returns {Object} Клавиатура
 */
function generateDealKeyboard(deal, player, game, quantity = 1) {
  const keyboard = {
    inline_keyboard: []
  };

  // Проверяем, есть ли у игрока активы с тем же group_id
  const hasSameGroupAssets = deal.group_Id && player.assets && player.assets.some(asset => asset.group_Id === deal.group_Id);

  // Проверяем, есть ли у игрока недвижимость
  const hasRealEstate = player.assets && player.assets.some(asset => asset.isRealEstate);

  // Если unlimitedStocks, показываем клавиатуру с количеством
  if (deal.unlimitedStocks) {
    keyboard.inline_keyboard = [
      [
        { text: '➖ 1', callback_data: 'decrease_quantity_1' },
        { text: '➕ 1', callback_data: 'increase_quantity_1' }
      ],
      [
        { text: '➖ 10', callback_data: 'decrease_quantity_10' },
        { text: '➕ 10', callback_data: 'increase_quantity_10' }
      ],
      [
        { text: '➖ 100', callback_data: 'decrease_quantity_100' },
        { text: '➕ 100', callback_data: 'increase_quantity_100' }
      ],
      [
        { text: '💰 Купить', callback_data: 'buy_deal' }
      ],
      [
        { text: '💳 Кредитная карта', callback_data: 'buy_deal_credit_card' }
      ]
    ];

    // Если canSellStocks и у игрока есть активы с тем же group_id, добавляем "Продать"
    if (deal.canSellStocks && hasSameGroupAssets) {
      keyboard.inline_keyboard.push([
        { text: '💸 Продать', callback_data: 'sell_stocks' }
      ]);
    }

    // Если нет expenses, добавляем "Пропустить" в конце
    if (!deal.expenses) {
      keyboard.inline_keyboard.push([
        { text: '⏭️ Пропустить', callback_data: 'skip_deal' }
      ]);
    }

    return keyboard;
  }

  // Если multiple, только кнопка "Пропустить"
  if (deal.multiple) {
    keyboard.inline_keyboard = [
      [
        { text: '⏭️ Пропустить', callback_data: 'skip_deal' }
      ]
    ];
    return keyboard;
  }

  // Если есть cost, кнопка "Купить"
  if (deal.cost) {
    keyboard.inline_keyboard.push([
      { text: '💰 Купить', callback_data: 'buy_deal' }
    ]);

    // Если нет unlimitedStocks, кнопка "Кредитная карта"
    if (!deal.unlimitedStocks) {
      keyboard.inline_keyboard.push([
        { text: '💳 Кредитная карта', callback_data: 'buy_deal_credit_card' }
      ]);
    }
  }

  // Если canSellToOthers, кнопка "Предложить другому"
  if (deal.canSellToOthers) {
    keyboard.inline_keyboard.push([
      { text: '👥 Предложить другому', callback_data: 'offer_deal' }
    ]);
  }

  // Если canSellStocks и у игрока есть активы с тем же group_id, кнопка "Продать"
  if (deal.canSellStocks && hasSameGroupAssets) {
    keyboard.inline_keyboard.push([
      { text: '💸 Продать', callback_data: 'sell_stocks' }
    ]);
  }

  // Если есть expenses и у игрока есть недвижимость
  if (deal.expenses && hasRealEstate) {
    keyboard.inline_keyboard = [
      [
        { text: '💰 Оплатить', callback_data: 'pay_expenses' }
      ],
      [
        { text: '💳 Кредитная карта', callback_data: 'buy_deal_credit_card' }
      ]
    ];
    return keyboard;
  }

  // Если есть expenses, но нет недвижимости - показываем "Пропустить"
  if (deal.expenses && !hasRealEstate) {
    keyboard.inline_keyboard = [
      [
        { text: '⏭️ Пропустить', callback_data: 'skip_deal' }
      ]
    ];
    return keyboard;
  }

  // Если нет expenses, добавляем "Пропустить" в конце
  if (!deal.expenses) {
    keyboard.inline_keyboard.push([
      { text: '⏭️ Пропустить', callback_data: 'skip_deal' }
    ]);
  }

  return keyboard;
}

/**
 * Клавиатура оплаты кредиткой
 */
const creditCardKeyboard = {
  inline_keyboard: [
    [
      { text: '💳 Оплатить кредиткой', callback_data: 'buy_deal_credit_card' }
    ],
    [
      { text: '⏭️ Пропустить', callback_data: 'skip_deal' }
    ]
  ]
};

/**
 * Клавиатура для профиля игрока
 */
const profileKeyboard = {
  inline_keyboard: [
    [
      { text: '🏠 Активы', callback_data: 'assets' },
      { text: '💳 Кредиты', callback_data: 'credits' }
    ]
  ]
};

module.exports = {
  welcomeKeyboard,
  endGameVoteKeyboard,
  waitingRoomKeyboard,
  gameKeyboard,
  charityKeyboard,
  dealTypeKeyboard,
  generateDealKeyboard,
  creditCardKeyboard,
  profileKeyboard
};
