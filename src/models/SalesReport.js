const mongoose = require('mongoose');

const salesReportSchema = new mongoose.Schema({
  period: {
    start: Date,
    end: Date
  },
  summary: {
    totalRevenue: Number,
    totalTransactions: Number,
    totalCustomers: Number,
    totalTarget: Number,
    currentTarget: Number,
    revenueGrowth: Number,
    transactionGrowth: Number,
    customerGrowth: Number,
    totalProducts: Number,
    productGrowth: Number
  },
  products: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    units: Number,
    revenue: Number,
    growth: Number
  }],
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  customers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  regionalData: [{
    region: String,
    growth: Number
  }],
  monthlySales: [{
    month: String,
    itemValue: Number,
    revenue: Number
  }]
}, {
  timestamps: true,
  collection: 'salesreports'
});

salesReportSchema.methods.calculateMetrics = async function() {
  const Transaction = mongoose.model('Transaction');
  const Product = mongoose.model('Product');
  const User = mongoose.model('User');

  const startDate = this.period.start;
  const endDate = this.period.end;

  const metrics = await Transaction.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalTransactions: { $count: {} },
        uniqueCustomers: { $addToSet: '$customerId' }
      }
    }
  ]);

  return metrics[0] || {};
};

module.exports = mongoose.model('SalesReport', salesReportSchema);
