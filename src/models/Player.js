const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  profession: {
    name: { type: String, required: true },
    salary: { type: Number, required: true },
    expenses: { type: Number, required: true },
    savings: { type: Number, required: true }
  },
  salary: { type: Number, required: true },
  expenses: { type: Number, required: true },
  cash: { type: Number, required: true },
  passiveIncome: { type: Number, required: true },
  totalIncome: { type: Number, required: true },
  totalExpenses: { type: Number, required: true },
  cashFlow: { type: Number, required: true },
  assets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }],
  liabilities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Liability' }],
  loans: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Loan' }],
  position: { type: Number, default: 0 },
  inFastTrack: { type: Boolean, default: false },
  fastTrackCash: { type: Number, default: 0 },
  fastTrackIncome: { type: Number, default: 0 },
  fastTrackPosition: { type: Number, default: 0 },
  dreamCost: { type: Number, default: 0 }
});

// Индексы для производительности
playerSchema.index({ userId: 1 });

module.exports = mongoose.model('Player', playerSchema);
