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
  },
  productType: String,
  totalAmount: {
    type: Number,
    required: true,
    default: function() {
      return this.amount * this.quantity;
    }
  }
}, {
  timestamps: true
});

saleSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('productId')) {
    try {
      const Product = mongoose.model('Product');
      const product = await Product.findById(this.productId);
      if (product) {
        this.productType = product.type;
        this.region = this.region || product.region;
      }
    } catch (error) {
      console.error('Error in sale pre-save:', error);
    }
  }
  next();
});

saleSchema.statics.getDashboardStats = async function(dateRange) {
  const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          region: "$region",
          productType: "$productType"
        },
        revenue: { $sum: "$totalAmount" },
        profit: { $sum: "$profit" },
        orders: { $sum: 1 }
      }
    }
  ]);
};

saleSchema.index({ createdAt: 1, status: 1 });
saleSchema.index({ region: 1, createdAt: 1 });
saleSchema.index({ productId: 1, createdAt: 1 });
saleSchema.index({ customerId: 1, createdAt: 1 });

module.exports = mongoose.model('Sale', saleSchema);
