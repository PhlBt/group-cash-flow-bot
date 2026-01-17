// Все клавиатуры бота

const keyboards = {
  // Стартовая клавиатура
  getStartInlineKeyboard: () => ({
    inline_keyboard: [
      [{ text: '🎮 Присоединиться к игре', callback_data: 'cmd_join' }],
      [{ text: '📚 Правила игры', callback_data: 'cmd_rules' }, { text: '📖 Помощь', callback_data: 'cmd_help' }]
    ]
  }),

  // Клавиатура действий в игре
  getGameActionsKeyboard: (assets = false) => {
    const keyboard = {
      inline_keyboard: [
        [{ text: '🎲 Бросить кубик', callback_data: 'cmd_roll' }],
        [{ text: '📊 Статус игры', callback_data: 'cmd_status' }, { text: '👤 Моя информация', callback_data: 'cmd_myinfo' }]
      ]
    };

    if (assets) {
      keyboard.inline_keyboard.push([
        { text: '💸 Кредиты', callback_data: 'cmd_loans' },
        { text: '📦 Активы', callback_data: 'cmd_sellasset' }
      ]);
    }

    return keyboard;
  },

  // Клавиатура после присоединения
  getJoinSuccessKeyboard: (hasGame) => {
    const keyboard = {
      inline_keyboard: []
    };

    if (!hasGame) {
      keyboard.inline_keyboard.push([
        { text: '▶️ Начать игру', callback_data: 'cmd_startgame' }
      ]);
    }

    keyboard.inline_keyboard.push([
      { text: '📊 Статус', callback_data: 'cmd_status' }
    ]);

    return keyboard;
  },

  // Клавиатура действий хода
  getTurnActionsKeyboard: () => ({
    inline_keyboard: [
      [{ text: '✅ Купить', callback_data: 'buy' }, { text: '❌ Пропустить', callback_data: 'skip' }]
    ]
  }),

  // Клавиатура Fast Track
  getFastTrackKeyboard: () => ({
    inline_keyboard: [
      [{ text: '✅ Принять', callback_data: 'fastaccept' }, { text: '❌ Пропустить', callback_data: 'fastskip' }]
    ]
  }),

  // Клавиатура броска Fast Track
  getFastTrackRollKeyboard: () => ({
    inline_keyboard: [
      [{ text: '🎲 Бросить кубик (Fast Track)', callback_data: 'cmd_fastroll' }]
    ]
  }),

  // Клавиатура хода игрока
  getPlayerTurnKeyboard: (player) => {
    if (player.inFastTrack) {
      return keyboards.getFastTrackRollKeyboard();
    }
    return keyboards.getGameActionsKeyboard();
  },

  // Клавиатура карты
  getCardKeyboard: (cardType) => {
    const keyboard = {
      inline_keyboard: []
    };

    if (cardType === 'small' || cardType === 'big') {
      keyboard.inline_keyboard.push([
        { text: '✅ Купить', callback_data: 'buy' },
        { text: '💳 Купить с кредитом', callback_data: 'buywithloan' }
      ]);
      keyboard.inline_keyboard.push([
        { text: '❌ Пропустить', callback_data: 'skip' }
      ]);
    } else if (cardType === 'doodad') {
      keyboard.inline_keyboard.push([
        { text: '💸 Оплатить', callback_data: 'pay' },
        { text: '💳 С кредитом', callback_data: 'paywithloan' }
      ]);
    }

    return keyboard;
  },

  // Клавиатура кредитов
  getLoansKeyboard: (loans) => {
    const keyboard = {
      inline_keyboard: []
    };

    loans.forEach((loan, index) => {
      keyboard.inline_keyboard.push([
        { text: `Погасить кредит #${index + 1} ($${loan.remainingAmount})`, callback_data: `payloan_${loan.id}_full` }
      ]);
    });

    keyboard.inline_keyboard.push([
      { text: '📊 Моя информация', callback_data: 'cmd_myinfo' }
    ]);

    return keyboard;
  },

  // Клавиатура продажи активов
  getSellAssetKeyboard: (assets) => {
    const keyboard = {
      inline_keyboard: []
    };

    assets.forEach((asset, index) => {
      keyboard.inline_keyboard.push([
        { text: `Продать актив #${index + 1} ($${asset.cost})`, callback_data: `sellasset_${asset.id}` }
      ]);
    });

    keyboard.inline_keyboard.push([
      { text: '📊 Моя информация', callback_data: 'cmd_myinfo' }
    ]);

    return keyboard;
  },

  // Специальные клавиатуры
  getBuyWithLoanKeyboard: () => ({
    inline_keyboard: [
      [
        { text: '💳 Купить с кредитом', callback_data: 'buywithloan' },
        { text: '❌ Отмена', callback_data: 'skip' }
      ]
    ]
  }),

  getPayWithLoanKeyboard: (canUseLoan) => ({
    inline_keyboard: canUseLoan
      ? [{ text: '💳 С кредитом', callback_data: 'paywithloan' }]
      : []
  })
};

module.exports = keyboards;
