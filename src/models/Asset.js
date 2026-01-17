const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  cost: { type: Number, required: true },
  downPayment: { type: Number, default: null },
  passiveIncome: { type: Number, default: 0 },
  type: { type: String, required: true },
  loanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', default: null }
});

// Индекс для поля id
assetSchema.index({ id: 1 });

module.exports = mongoose.model('Asset', assetSchema);
