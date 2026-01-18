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
 * Клавиатура действий с карточкой сделки
 */
const dealKeyboard = {
  inline_keyboard: [
    [
      { text: '💰 Купить', callback_data: 'buy_deal' }
    ],
    [
      { text: '⏭️ Пропустить', callback_data: 'skip_deal' }
    ],
    [
      { text: '👥 Предложить игроку', callback_data: 'offer_deal' },
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
  dealKeyboard
};
