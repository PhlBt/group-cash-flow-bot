const mongoose = require('mongoose');

const playerGameStatsSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  profession: { type: String, required: true },
  movesCount: { type: Number, default: 0 },
  finalCash: { type: Number, default: 0 },
  finalCashFlow: { type: Number, default: 0 },
  fastTrackEntered: { type: Boolean, default: false },
  fastTrackPosition: { type: Number, default: 0 },
  fastTrackCash: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['playing', 'won', 'lost', 'bankrupt'],
    default: 'playing'
  },
  enteredAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: null }
});

const gameStatsSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  chatId: { type: String, required: true },
  gameName: { type: String, default: 'CashFlow Game' },
  players: [playerGameStatsSchema],
  totalMoves: { type: Number, default: 0 },
  winner: {
    userId: { type: String },
    username: { type: String },
    finalCash: { type: Number },
    finishedAt: { type: Date }
  },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: null },
  duration: { type: Number, default: 0 }, // в минутах
  status: {
    type: String,
    enum: ['active', 'finished', 'abandoned'],
    default: 'active'
  }
});

// Индексы создаются автоматически для unique полей

module.exports = mongoose.model('GameStats', gameStatsSchema);
