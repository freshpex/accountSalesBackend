const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Product type is required'],
    enum: ['instagram', 'facebook', 'twitter', 'whatsapp', 'youtube', 'tiktok', 'foreignnumber', 'whatsappnumber']
  },
  username: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['available', 'sold', 'pending'],
    default: 'available'
  },
  followers: {
    type: Number,
    default: 0
  },
  engagement: {
    type: Number,
    default: 0
  },
  age: {
    type: Number,
    default: 0
  },
  price: {
    type: Number,
    default: 0
  },
  region: {
    type: String,
    trim: true
  },
  about: {
    type: String,
    trim: true
  },
  images: [{
    type: String
  }],
  stats: {
    averageLikes: {
      type: Number,
      default: 0
    },
    averageComments: {
      type: Number,
      default: 0
    }
  },
  security: {
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    originalEmailAvailable: {
      type: Boolean,
      default: false
    }
  },
  accountCredentials: {
    accountEmail: {
      type: String,
      trim: true,
      default: ''
    },
    accountPassword: {
      type: String,
      trim: true,
      default: ''
    },
    accountPhoneNumber: {
      type: String,
      trim: true,
      default: ''
    },
    additionalInfo: {
      type: String,
      trim: true,
      default: ''
    }
  },
  sales: {
    count: { type: Number, default: 0 },
    lastSaleAt: Date,
    totalRevenue: { type: Number, default: 0 }
  },
  analytics: {
    views: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    popularity: { type: Number, default: 0 }
  },
  metrics: {
    totalViews: { type: Number, default: 0 },
    uniqueViews: { type: Number, default: 0 },
    lastViewed: Date,
    salesCount: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageSalePrice: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 }
  },
  performance: {
    popularity: { type: Number, default: 0 },
    trending: { type: Boolean, default: false },
    lastSaleAt: Date,
    lastUpdated: Date
  }
}, {
  timestamps: true
});

// Pre-save middleware to update metrics
productSchema.pre('save', function(next) {
  if (this.isModified('metrics.salesCount') || this.isModified('metrics.totalRevenue')) {
    this.metrics.averageSalePrice = this.metrics.salesCount > 0 
      ? this.metrics.totalRevenue / this.metrics.salesCount 
      : this.price;
    
    this.metrics.conversionRate = this.metrics.uniqueViews > 0 
      ? (this.metrics.salesCount / this.metrics.uniqueViews) * 100 
      : 0;
      
    this.performance.lastUpdated = new Date();
  }
  next();
});

// Method to record a sale
productSchema.methods.recordSale = async function(saleAmount) {
  this.metrics.salesCount += 1;
  this.metrics.totalRevenue += saleAmount;
  this.performance.lastSaleAt = new Date();
  this.status = 'sold';
  
  // Update popularity score
  this.performance.popularity = calculatePopularityScore(this);
  
  await this.save();
};

// Method to record a view
productSchema.methods.recordView = async function(userId) {
  this.metrics.totalViews += 1;
  
  const ViewLog = mongoose.model('ViewLog');
  const isUnique = await ViewLog.findOne({ 
    productId: this._id,
    userId,
    createdAt: { 
      $gte: new Date(Date.now() - 24*60*60*1000) 
    }
  });
  
  if (!isUnique) {
    this.metrics.uniqueViews += 1;
    await ViewLog.create({ productId: this._id, userId });
  }
  
  this.metrics.lastViewed = new Date();
  await this.save();
};

productSchema.statics.getPopular = function(limit = 5) {
  return this.find({ 
    status: { $in: ['available', 'sold'] },
    'metrics.salesCount': { $gt: 0 }
  })
  .sort({ 
    'performance.popularity': -1,
    'metrics.salesCount': -1,
    'metrics.totalRevenue': -1 
  })
  .limit(limit)
  .select('username type price metrics status performance');
};

// Helper function to calculate popularity score
function calculatePopularityScore(product) {
  const now = new Date();
  const daysSinceLastSale = product.performance.lastSaleAt
    ? (now - product.performance.lastSaleAt) / (1000 * 60 * 60 * 24)
    : 30;

  const salesWeight = 0.4;
  const viewsWeight = 0.3;
  const recentSalesWeight = 0.3;

  const salesScore = product.metrics.salesCount * salesWeight;
  const viewsScore = (product.metrics.uniqueViews / 100) * viewsWeight;
  const recencyScore = (1 / (daysSinceLastSale + 1)) * recentSalesWeight;

  return salesScore + viewsScore + recencyScore;
}

// Create necessary indexes
productSchema.index({ 'performance.popularity': -1 });
productSchema.index({ 'metrics.salesCount': -1 });
productSchema.index({ status: 1, type: 1 });
productSchema.index({ 'metrics.totalRevenue': -1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);

const viewLogSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400
  }
});

viewLogSchema.index({ productId: 1, userId: 1, createdAt: 1 });
mongoose.model('ViewLog', viewLogSchema);
