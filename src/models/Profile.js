const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  firstName: String,
  lastName: String,
  email: String,
  phoneNumber: String,
  address: String,
  country: String,
}, {
  timestamps: true
});

module.exports = mongoose.model('Profile', profileSchema);
