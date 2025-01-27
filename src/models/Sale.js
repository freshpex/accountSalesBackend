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
  region: {
    type: String,
    required: true,
    default: 'unknown'
  },
  salesPerson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    required: true
  },
  priceAtSale: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

saleSchema.pre('save', async function(next) {
  if (!this.profit) {
    this.profit = this.amount * 0.2;
  }
  
  if (!this.type && this.productId) {
    try {
      const Product = mongoose.model('Product');
      const product = await Product.findById(this.productId);
      if (product) {
        this.type = product.type;
        this.priceAtSale = product.price;
      }
    } catch (error) {
      console.error('Error in sale pre-save:', error);
    }
  }
  next();
});

saleSchema.post('save', async function(doc) {
  try {
    const Product = mongoose.model('Product');
    const Customer = mongoose.model('Customer');
    
    // Update product sales metrics
    await Product.findByIdAndUpdate(doc.productId, {
      $inc: {
        'sales.count': 1,
        'sales.totalRevenue': doc.amount
      },
      $set: {
        'sales.lastSaleAt': doc.createdAt,
        status: 'sold'
      }
    });

    // Update customer metrics
    await Customer.findByIdAndUpdate(doc.customerId, {
      $inc: {
        'metrics.totalSpent': doc.amount,
        'metrics.totalOrders': 1
      },
      $set: {
        'metrics.lastOrderDate': doc.createdAt
      }
    });
  } catch (error) {
    console.error('Error in sale post-save hook:', error);
  }
});

saleSchema.index({ createdAt: 1, status: 1 });
saleSchema.index({ region: 1, createdAt: 1 });
saleSchema.index({ productId: 1, createdAt: 1 });
saleSchema.index({ customerId: 1, createdAt: 1 });
saleSchema.index({ type: 1, createdAt: -1 });
saleSchema.index({ priceAtSale: 1 });

module.exports = mongoose.model('Sale', saleSchema);
