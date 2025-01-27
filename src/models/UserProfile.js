const mongoose = require('mongoose');

const notificationPreferencesSchema = new mongoose.Schema({
  email: {
    newsUpdates: { type: Boolean, default: false },
    accountActivity: { type: Boolean, default: false },
    promotions: { type: Boolean, default: false }
  },
  push: {
    messages: { type: Boolean, default: false },
    mentions: { type: Boolean, default: false },
    reminders: { type: Boolean, default: false }
  },
  sms: {
    security: { type: Boolean, default: false },
    orders: { type: Boolean, default: false }
  },
  browser: {
    desktop: { type: Boolean, default: false },
    sound: { type: Boolean, default: false },
    background: { type: Boolean, default: false }
  }
});

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  firstName: String,
  lastName: String,
  gender: String,
  birthDate: Date,
  profilePicture: {
    type: String,
    default: null
  },
  profilePictureHistory: [{
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  phoneNumber: String,
  country: String,
  address: String,
  securitySettings: {
    twoFactorEnabled: { type: Boolean, default: false },
    lastPasswordChange: Date,
    loginHistory: [{
      device: String,
      location: String,
      timestamp: Date
    }],
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  notificationPreferences: notificationPreferencesSchema
}, {
  timestamps: true
});

userProfileSchema.methods.updateProfilePicture = async function(url) {
  if (this.profilePicture) {
    this.profilePictureHistory.push({
      url: this.profilePicture,
      uploadedAt: new Date()
    });
  }
  this.profilePicture = url;
  return this.save();
};

module.exports = mongoose.model('UserProfile', userProfileSchema);
