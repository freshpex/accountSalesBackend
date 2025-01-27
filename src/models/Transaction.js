const mongoose = require('mongoose');
const Sale = require('./Sale');

const transactionSchema = new mongoose.Schema({
  transactionId: String,
  tx_ref: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    default: '000000000000000000000000'
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserProfile',
    required: true,
    default: '000000000000000000000000'
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    default: '000000000000000000000000'
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  currency: {
    type: String,
    default: 'NGN'
  },
  paymentMethod: {
    type: String,
    default: 'flutterwave'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'failed', 'refunded'],
    default: 'unpaid'
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

transactionSchema.post('save', async function(doc) {
  if (doc.status === 'completed' && doc.paymentStatus === 'paid') {
    try {
      const sale = new Sale({
        transactionId: doc._id,
        productId: doc.productId,
        customerId: doc.customerId,
        amount: doc.amount,
        quantity: 1,
        status: 'completed',
        paymentMethod: doc.paymentMethod,
        region: doc.meta?.region || 'unknown',
        type: doc.meta?.productType,
        priceAtSale: doc.amount
      });
      await sale.save();

      // Update user metrics
      const User = mongoose.model('User');
      const user = await User.findById(doc.userId);
      if (user) {
        await user.updateMetrics(doc.amount);
        await user.trackActivity({
          type: 'purchase',
          details: `Purchased product for ${doc.amount}`,
          metadata: {
            productId: doc.productId,
            amount: doc.amount,
            transactionId: doc._id
          }
        });
      }

      const Product = mongoose.model('Product');
      const product = await Product.findById(doc.productId);
      if (product) {
        await product.recordSale(doc.amount);
      }
    } catch (error) {
      console.error('Transaction post-save error:', error);
    }
  }
});

transactionSchema.index({ createdAt: -1, status: 1, paymentStatus: 1 });
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ customerId: 1, createdAt: -1 });
transactionSchema.index({ productId: 1, status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
