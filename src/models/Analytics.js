const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  metrics: {
    totalRevenue: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    uniqueCustomers: { type: Number, default: 0 },
    newCustomers: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    productViews: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 }
  },
  productMetrics: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    views: Number,
    sales: Number,
    revenue: Number
  }],
  segmentMetrics: {
    bronze: { count: Number, revenue: Number },
    silver: { count: Number, revenue: Number },
    gold: { count: Number, revenue: Number },
    platinum: { count: Number, revenue: Number }
  }
}, {
  timestamps: true
});

analyticsSchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model('Analytics', analyticsSchema);
