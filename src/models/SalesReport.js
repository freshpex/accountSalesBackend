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

  const [transactionMetrics, productMetrics, customerMetrics] = await Promise.all([
    Transaction.aggregate([
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
          uniqueCustomers: { $addToSet: '$customerId' },
          avgTicketSize: { $avg: '$amount' }
        }
      }
    ]),
    Product.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$type',
          totalSold: { $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] } },
          revenue: { $sum: '$price' }
        }
      }
    ]),
    User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$segment',
          count: { $sum: 1 },
          totalSpent: { $sum: '$metrics.totalSpent' }
        }
      }
    ])
  ]);

  return {
    transactions: transactionMetrics[0] || {},
    products: productMetrics,
    customers: customerMetrics
  };
};

// Add performance tracking methods
salesReportSchema.methods.trackPerformance = async function() {
  // Implement performance tracking logic
};

module.exports = mongoose.model('SalesReport', salesReportSchema);
