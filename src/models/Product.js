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
  }
}, {
  timestamps: true
});

productSchema.methods.updateSales = async function(saleAmount) {
  this.sales.count += 1;
  this.sales.lastSaleAt = new Date();
  this.sales.totalRevenue += saleAmount;
  this.analytics.popularity = (this.sales.count * 0.6) + (this.analytics.views * 0.4);
  return this.save();
};

module.exports = mongoose.model('Product', productSchema);
