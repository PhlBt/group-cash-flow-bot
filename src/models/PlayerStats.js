const mongoose = require('mongoose');

const playerStatsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },

  // Общая статистика
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  gamesLost: { type: Number, default: 0 },
  gamesBankrupt: { type: Number, default: 0 },

  // Финансовая статистика
  totalCashEarned: { type: Number, default: 0 },
  totalCashLost: { type: Number, default: 0 },
  bestCashFlow: { type: Number, default: 0 },
  averageCashFlow: { type: Number, default: 0 },

  // Fast Track статистика
  fastTrackEntries: { type: Number, default: 0 },
  fastTrackWins: { type: Number, default: 0 },
  bestFastTrackCash: { type: Number, default: 0 },

  // Профессии
  professionsPlayed: [{
    name: { type: String, required: true },
    count: { type: Number, default: 1 }
  }],

  // Достижения
  achievements: [{
    name: { type: String, required: true },
    description: { type: String },
    unlockedAt: { type: Date, default: Date.now },
    gameId: { type: String }
  }],

  // Последняя активность
  lastPlayed: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware для обновления updatedAt
playerStatsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Индексы для производительности
playerStatsSchema.index({ userId: 1 });
playerStatsSchema.index({ gamesPlayed: -1 });
playerStatsSchema.index({ gamesWon: -1 });

module.exports = mongoose.model('PlayerStats', playerStatsSchema);
