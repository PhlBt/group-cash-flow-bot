const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  type: { type: String, default: 'loan' },
  amount: { type: Number, required: true },
  remainingAmount: { type: Number, required: true },
  monthlyPayment: { type: Number, required: true },
  assetTitle: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Индекс для поля id
loanSchema.index({ id: 1 });

module.exports = mongoose.model('Loan', loanSchema);
