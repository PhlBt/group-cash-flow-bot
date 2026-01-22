/**
 * Модуль с клавиатурами для Telegram бота
 */
const { formatNumber } = require('../utils');

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
    ],
    [
      { text: 'Отблагодарить разработчика', url: 'https://pay.cloudtips.ru/p/fb264aa5' }
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
      { text: '🎮 Присоединиться к игре', callback_data: 'play' }
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
 * Клавиатура состояния банкротства
 */
const bankruptcyKeyboard = {
  inline_keyboard: [
    [
      { text: '🏠 Активы', callback_data: 'assets' },
      { text: '💳 Кредиты', callback_data: 'credits' }
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
 * Клавиатура выбора действия на поле благотворительности
 */
const charityChoiceKeyboard = {
  inline_keyboard: [
    [
      { text: '💰 Пожертвовать 10% дохода', callback_data: 'donate_charity' }
    ],
    [
      { text: '⏭️ Пропустить ход', callback_data: 'skip_charity' }
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

  // Проверяем, находится ли игра в циркуляции canSellStocks
  const isInCanSellStocksCirculation = game.dealCirculationPlayers && game.dealCirculationPlayers.length > 0 && deal.canSellStocks;
  // Определяем, является ли текущий игрок оригинальным в циркуляции canSellStocks
  const isOriginalPlayerInCirculation = isInCanSellStocksCirculation && game.currentPlayerIndex === game.dealCirculationOriginalIndex;

  // Проверяем состояние предложения сделки
  const offerState = game.offerState;

  // Если есть активное предложение сделки и игрок - предлагающий
  if (offerState && offerState.offeringUserId === player.userId) {
    return generateOfferKeyboard(offerState, game.players);
  }

  // Если сделка предложена другому игроку, показываем ограниченную клавиатуру
  if (deal.commission !== undefined) {
    keyboard.inline_keyboard = [
      [{ text: '💰 Купить', callback_data: 'buy_deal' }],
      [{ text: '💳 Кредитная карта', callback_data: 'buy_deal_credit_card' }],
      [{ text: '⏭️ Пропустить', callback_data: 'skip_deal' }]
    ];
    return keyboard;
  }

  // Если unlimitedStocks, показываем клавиатуру с количеством
  if (deal.unlimitedStocks) {
    // Для неоригинальных игроков в циркуляции canSellStocks не показываем кнопки изменения количества
    if (!isInCanSellStocksCirculation || isOriginalPlayerInCirculation) {
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
        ]
      ];
    }

    // Для неоригинальных игроков в циркуляции canSellStocks не показываем кнопки покупки
    if (!isInCanSellStocksCirculation || isOriginalPlayerInCirculation) {
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
 * Генерирует клавиатуру для предложения сделки
 * @param {Object} offerState - Состояние предложения
 * @param {Array} players - Массив игроков
 * @returns {Object} Клавиатура
 */
function generateOfferKeyboard(offerState, players) {
  const keyboard = {
    inline_keyboard: []
  };

  if (offerState.step === 'commission') {
    // Клавиатура выбора комиссии
    keyboard.inline_keyboard = [
      [
        { text: '1%', callback_data: 'select_commission_1' },
        { text: '3%', callback_data: 'select_commission_3' },
        { text: '5%', callback_data: 'select_commission_5' }
      ],
      [
        { text: '10%', callback_data: 'select_commission_10' },
        { text: '15%', callback_data: 'select_commission_15' },
        { text: '20%', callback_data: 'select_commission_20' }
      ],
      [
        { text: 'Вернуться', callback_data: 'cancel_offer' }
      ]
    ];
  } else if (offerState.step === 'select_user') {
    // Клавиатура выбора пользователя
    const offeringUserId = offerState.offeringUserId;
    const otherPlayers = players.filter(p => p.userId !== offeringUserId);

    // Добавляем кнопки игроков (максимум 6 в ряд, или по 2 в ряд)
    const buttonsPerRow = 2;
    for (let i = 0; i < otherPlayers.length; i += buttonsPerRow) {
      const row = otherPlayers.slice(i, i + buttonsPerRow).map(player => ({
        text: player.username,
        callback_data: `select_user_${player.userId}`
      }));
      keyboard.inline_keyboard.push(row);
    }

    // Добавляем кнопку "Вернуться"
    keyboard.inline_keyboard.push([
      { text: 'Вернуться', callback_data: 'cancel_offer' }
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
 * Генерирует клавиатуру для поля "Безработица"
 * @param {number} amount - Сумма к оплате
 * @returns {Object} Клавиатура
 */
function generateDismissalKeyboard(amount) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: `💰 Оплатить ${formatNumber(amount)} ₽`, callback_data: 'pay_dismissal' }
      ]
    ]
  };

  return keyboard;
}

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

/**
 * Клавиатура для сообщения о завершении игры
 */
const gameFinishedKeyboard = {
  inline_keyboard: [
    [
      { text: 'Отблагодарить разработчика', url: 'https://pay.cloudtips.ru/p/fb264aa5' }
    ]
  ]
};

/**
 * Клавиатура для сообщения о проигрыше
 */
const gameLostKeyboard = {
  inline_keyboard: [
    [
      { text: 'Отблагодарить разработчика', url: 'https://pay.cloudtips.ru/p/fb264aa5' }
    ]
  ]
};

/**
 * Клавиатура для команд /rules и /help
 */
const developerKeyboard = {
  inline_keyboard: [
    [
      { text: 'Отблагодарить разработчика', url: 'https://pay.cloudtips.ru/p/fb264aa5' }
    ]
  ]
};

module.exports = {
  welcomeKeyboard,
  endGameVoteKeyboard,
  waitingRoomKeyboard,
  gameKeyboard,
  bankruptcyKeyboard,
  charityKeyboard,
  charityChoiceKeyboard,
  dealTypeKeyboard,
  generateDealKeyboard,
  creditCardKeyboard,
  generateDismissalKeyboard,
  profileKeyboard,
  gameFinishedKeyboard,
  gameLostKeyboard,
  developerKeyboard
};
