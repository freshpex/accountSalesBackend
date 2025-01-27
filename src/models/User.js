const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  businessName: {
    type: String,
    required: true,
  },
  businessType: {
    type: String,
    enum: ['retail', 'wholesale', 'service', 'other'],
  },
  phoneNumber: String,
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  segment: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  metrics: {
    totalSpent: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    lastOrderDate: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true,
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.updateMetrics = async function(transactionAmount) {
  this.metrics.totalSpent += transactionAmount;
  this.metrics.totalOrders += 1;
  this.metrics.lastOrderDate = new Date();

  if (this.metrics.totalSpent >= 1000000) this.segment = 'platinum';
  else if (this.metrics.totalSpent >= 500000) this.segment = 'gold';
  else if (this.metrics.totalSpent >= 100000) this.segment = 'silver';

  return this.save();
};

userSchema.methods.trackActivity = async function(activity) {
  const ActivityLog = mongoose.model('ActivityLog');
  return ActivityLog.create({
    userId: this._id,
    type: activity.type,
    details: activity.details,
    metadata: activity.metadata
  });
};

userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ segment: 1 });
userSchema.index({ 'metrics.totalSpent': -1 });

module.exports = mongoose.model('User', userSchema);
