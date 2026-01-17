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

module.exports = {
  welcomeKeyboard,
  endGameVoteKeyboard
};
