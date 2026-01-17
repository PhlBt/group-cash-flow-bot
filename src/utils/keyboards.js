const { formatNumber } = require('./formatters');

function getStartInlineKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🎮 Присоединиться к игре', callback_data: 'cmd_join' }],
      [{ text: '📚 Правила игры', callback_data: 'cmd_rules' }, { text: '📖 Помощь', callback_data: 'cmd_help' }]
    ]
  };
}

function getGameActionsKeyboard(assets, hideMyInfo = false, hideStatus = false, hideAssets = false) {
  const keyboard = {
    inline_keyboard: [
      [{ text: '🎲 Бросить кубик', callback_data: 'cmd_roll' }]
    ]
  };

  // Добавляем кнопку "Статус игры" только если не просим её скрыть
  if (!hideStatus) {
    keyboard.inline_keyboard[0].push({ text: '📊 Статус игры', callback_data: 'cmd_status' });
  }

  // Добавляем кнопки кредитов и активов, если запрошено
  if (assets) {
    keyboard.inline_keyboard.push([
      { text: '💸 Кредиты', callback_data: 'cmd_loans' },
      { text: '📦 Активы', callback_data: 'cmd_viewassets' }
    ]);
  }

  return keyboard;
}

function getJoinSuccessKeyboard(hasGame) {
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
}

function getCardKeyboard(cardType) {
  const keyboard = {
    inline_keyboard: []
  };

  if (cardType === 'small' || cardType === 'big') {
    keyboard.inline_keyboard.push([
      { text: '✅ Купить', callback_data: 'buy' },
      { text: '💳 Купить с кредитом', callback_data: 'buywithloan' }
    ]);
    keyboard.inline_keyboard.push([
      { text: '🤝 Продать сделку', callback_data: 'sell_deal' }
    ]);
    keyboard.inline_keyboard.push([
      { text: '❌ Пропустить', callback_data: 'skip' }
    ]);
  } else if (cardType === 'doodad') {
    keyboard.inline_keyboard.push([
      { text: '💸 Оплатить', callback_data: 'pay' },
      { text: '💳 Кредитная карта', callback_data: 'use_credit_card' }
    ]);
  } else if (cardType === 'sell_deal_select_player') {
    // Клавиатура для выбора игрока при продаже сделки
    // Будет заполняться динамически
  } else if (cardType === 'sell_deal_markup') {
    // Клавиатура для выбора наценки
    keyboard.inline_keyboard.push([
      { text: '1%', callback_data: 'set_markup_1' },
      { text: '3%', callback_data: 'set_markup_3' },
      { text: '5%', callback_data: 'set_markup_5' }
    ]);
  } else if (cardType === 'sell_deal_response') {
    // Клавиатура для ответа на предложение сделки
    keyboard.inline_keyboard.push([
      { text: '✅ Принять', callback_data: 'accept_deal' },
      { text: '❌ Отказаться', callback_data: 'decline_deal' }
    ]);
  } else if (cardType === 'market_trade') {
    keyboard.inline_keyboard.push([
      { text: '✅ Купить', callback_data: 'buy_market' }
    ]);
    keyboard.inline_keyboard.push([
      { text: '💰 Продать', callback_data: 'sell_market' }
    ]);
    keyboard.inline_keyboard.push([
      { text: '❌ Пропустить', callback_data: 'skip' }
    ]);
  } else if (cardType === 'deal_choice') {
    keyboard.inline_keyboard.push([
      { text: '1️⃣ Малая сделка', callback_data: 'small_deal' },
      { text: '2️⃣ Большая сделка', callback_data: 'big_deal' }
    ]);
  } else if (cardType === 'charity') {
    keyboard.inline_keyboard.push([
      { text: '✅ Принять', callback_data: 'charity_accept' },
      { text: '❌ Пропустить', callback_data: 'charity_skip' }
    ]);
  } else if (cardType === 'opportunity_payment') {
    keyboard.inline_keyboard.push([
      { text: '💸 Оплатить', callback_data: 'pay_opportunity' },
      { text: '❌ Пропустить', callback_data: 'skip_opportunity' }
    ]);
  } else if (cardType === 'dice_choice') {
    keyboard.inline_keyboard.push([
      { text: '🎲 Бросить 1 кубик', callback_data: 'roll_one' },
      { text: '🎲 Бросить 2 кубика', callback_data: 'roll_two' }
    ]);
  } else if (cardType === 'opportunity') {
    keyboard.inline_keyboard.push([
      { text: '💸 Оплатить', callback_data: 'pay_opportunity' },
      { text: '💳 Кредитная карта', callback_data: 'use_credit_card_opportunity' }
    ]);
  }

  return keyboard;
}

function getLoansKeyboard(loans, page = 0) {
  const ITEMS_PER_PAGE = 5;
  const keyboard = {
    inline_keyboard: []
  };

  const startIndex = page * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, loans.length);
  const currentLoans = loans.slice(startIndex, endIndex);

  // Добавляем кредиты для текущей страницы
  currentLoans.forEach((loan, index) => {
    const globalIndex = startIndex + index + 1;
    keyboard.inline_keyboard.push([
      { text: `Погасить кредит #${globalIndex} (${formatNumber(loan.remainingAmount)} ₽)`, callback_data: `payloan_${loan.id}_full` }
    ]);
  });

  // Добавляем кнопки навигации если нужно
  if (page > 0 || endIndex < loans.length) {
    const navigationButtons = [];
    if (page > 0) {
      navigationButtons.push({ text: '⬅️ Назад', callback_data: `loans_page_${page - 1}` });
    }
    if (endIndex < loans.length) {
      navigationButtons.push({ text: '➡️ Далее', callback_data: `loans_page_${page + 1}` });
    }
    keyboard.inline_keyboard.push(navigationButtons);
  }

  // Добавляем кнопку "Моя информация" в отдельной строке
  keyboard.inline_keyboard.push([
    { text: '📊 Моя информация', callback_data: 'cmd_myinfo' }
  ]);

  return keyboard;
}

function getSellAssetKeyboard(assets, page = 0, viewOnly = false) {
  const ITEMS_PER_PAGE = 5;
  const keyboard = {
    inline_keyboard: []
  };

  const startIndex = page * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, assets.length);
  const currentAssets = assets.slice(startIndex, endIndex);

  // Добавляем активы для текущей страницы
  currentAssets.forEach((asset, index) => {
    const globalIndex = startIndex + index + 1;
    if (!viewOnly) {
      // Показываем кнопки продажи только если не режим просмотра
      keyboard.inline_keyboard.push([
        { text: `Продать актив #${globalIndex} (${formatNumber(asset.cost)} ₽)`, callback_data: `sellasset_${asset.id}` }
      ]);
    }
    // В режиме просмотра просто показываем информацию без кнопок
  });

  // Добавляем кнопки навигации если нужно и если не режим просмотра
  if (!viewOnly && (page > 0 || endIndex < assets.length)) {
    const navigationButtons = [];
    if (page > 0) {
      navigationButtons.push({ text: '⬅️ Назад', callback_data: `assets_page_${page - 1}` });
    }
    if (endIndex < assets.length) {
      navigationButtons.push({ text: '➡️ Далее', callback_data: `assets_page_${page + 1}` });
    }
    keyboard.inline_keyboard.push(navigationButtons);
  }

  // Добавляем кнопку "Моя информация" в отдельной строке
  keyboard.inline_keyboard.push([
    { text: '📊 Моя информация', callback_data: 'cmd_myinfo' }
  ]);

  return keyboard;
}

function getTurnActionsKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '✅ Купить', callback_data: 'buy' }, { text: '❌ Пропустить', callback_data: 'skip' }]
    ]
  };
}

function getFastTrackKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '✅ Принять', callback_data: 'fastaccept' }, { text: '❌ Пропустить', callback_data: 'fastskip' }]
    ]
  };
}

function getFastTrackRollKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🎲 Бросить кубик (Скоростная дорожка)', callback_data: 'cmd_fastroll' }]
    ]
  };
}

function getDealActionsKeyboard(card) {
  const keyboard = {
    inline_keyboard: []
  };

  keyboard.inline_keyboard.push([
    { text: '🔹 Малая сделка', callback_data: 'small_deal' },
    { text: '🔺 Большая сделка', callback_data: 'big_deal' }
  ]);

  keyboard.inline_keyboard.push([
    { text: '❌ Пропустить клетку', callback_data: 'skip' }
  ]);

  return keyboard;
}

function getDiceChoiceKeyboard() {
  const keyboard = {
    inline_keyboard: []
  };

  keyboard.inline_keyboard.push([
    { text: '1️⃣ Один кубик', callback_data: 'roll_one' },
    { text: '2️⃣ Два кубика', callback_data: 'roll_two' }
  ]);

  return keyboard;
}

function getPlayerTurnKeyboard(player) {
  if (player.inFastTrack) {
    return getFastTrackRollKeyboard();
  }
  if (player.charityTurnsLeft > 0) {
    return getCharityTurnKeyboard();
  }
  return getGameActionsKeyboard();
}

function getCharityTurnKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🎲 Бросить 1 кубик', callback_data: 'roll_one' },{ text: '🎲 Бросить 2 кубика', callback_data: 'roll_two' }],
      [{ text: '📊 Статус игры', callback_data: 'cmd_status' }]
    ]
  };
}

// Динамическая клавиатура для выбора игрока при продаже сделки
function getSellDealPlayerSelectKeyboard(otherPlayers) {
  const keyboard = {
    inline_keyboard: []
  };

  otherPlayers.forEach((player, index) => {
    keyboard.inline_keyboard.push([
      { text: `${index + 1}. ${player.username} (💰 ${formatNumber(player.cash)} ₽)`, callback_data: `offer_deal_${index + 1}` }
    ]);
  });

  return keyboard;
}

// Клавиатура для выбора игрока для голосования за кик
function getKickVotePlayerSelectKeyboard(otherPlayers) {
  const keyboard = {
    inline_keyboard: []
  };

  otherPlayers.forEach((player) => {
    keyboard.inline_keyboard.push([
      { text: `🗳️ ${player.username}`, callback_data: `votekick_${player.userId}` }
    ]);
  });

  return keyboard;
}

module.exports = {
  getStartInlineKeyboard,
  getGameActionsKeyboard,
  getJoinSuccessKeyboard,
  getCardKeyboard,
  getLoansKeyboard,
  getSellAssetKeyboard,
  getDealActionsKeyboard,
  getTurnActionsKeyboard,
  getFastTrackKeyboard,
  getFastTrackRollKeyboard,
  getPlayerTurnKeyboard,
  getSellDealPlayerSelectKeyboard,
  getKickVotePlayerSelectKeyboard
};
