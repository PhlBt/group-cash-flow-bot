const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  currentPlayerId: { type: String, default: null },
  gameStarted: { type: Boolean, default: false },
  gameFinished: { type: Boolean, default: false },
  currentCard: { type: mongoose.Schema.Types.Mixed, default: null },
  waitingForAction: { type: Boolean, default: false },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  loser: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  kickVotes: { type: Map, of: [String], default: new Map() }, // targetUserId -> [voterIds]
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware для обновления updatedAt
gameSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Индексы создаются автоматически для unique полей

module.exports = mongoose.model('Game', gameSchema);
