// Импорт всех обработчиков из модулей
const commands = require('./commands');
const callbacks = require('./callbacks');
const deals = require('./deals');
const profile = require('./profile');
const error = require('./error');

  // Экспорт всех функций для совместимости с main.js
module.exports = {
  // Команды
  handleStart: commands.handleStart,
  handleHelp: commands.handleHelp,
  handleNewGame: commands.handleNewGame,
  handlePlay: commands.handlePlay,
  handleEndGame: commands.handleEndGame,
  handleLeave: commands.handleLeave,
  handleRules: commands.handleRules,
  handleVoteKick: commands.handleVoteKick,

  // Callbacks
  handleCallbackQuery: callbacks.handleCallbackQuery,
  handleRollDice: callbacks.handleRollDice,
  handleEndGameVote: commands.handleEndGameVote,

  // Deals
  handleDealType: deals.handleDealType,
  handleBuyDeal: deals.handleBuyDeal,
  handleSkipDeal: deals.handleSkipDeal,
  handleBuyDealWithCreditCard: deals.handleBuyDealWithCreditCard,
  handleChangeQuantity: deals.handleChangeQuantity,
  handleSellStocks: deals.handleSellStocks,
  handlePayExpenses: deals.handlePayExpenses,

  // Profile
  handleProfile: profile.handleProfile,
  handleStats: profile.handleStats,
  handleAssets: profile.handleAssets,
  handleCredits: profile.handleCredits,

  // Error
  handleErrorMessage: error.handleErrorMessage,

  // Admin commands
  handleAdminOpenThread: commands.handleAdminOpenThread,
  handleAdminCloseThread: commands.handleAdminCloseThread
};
