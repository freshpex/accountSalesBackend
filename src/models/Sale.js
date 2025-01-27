const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  profit: Number,
  commission: Number,
  status: {
    type: String,
    enum: ['completed', 'pending', 'cancelled'],
    default: 'completed'
  },
  paymentMethod: String,
  region: String,
  salesPerson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

saleSchema.index({ createdAt: 1, status: 1 });
saleSchema.index({ region: 1, createdAt: 1 });
saleSchema.index({ productId: 1, createdAt: 1 });
saleSchema.index({ customerId: 1, createdAt: 1 });

module.exports = mongoose.model('Sale', saleSchema);
