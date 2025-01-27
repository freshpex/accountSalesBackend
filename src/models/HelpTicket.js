const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  message: String,
  sender: {
    type: String,
    enum: ['customer', 'admin']
  },
  senderDetails: {
    id: mongoose.Schema.Types.ObjectId,
    name: String,
    email: String,
    role: String
  },
  attachments: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ticketSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerDetails: {
    name: String,
    email: String,
    profilePicture: String
  },
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'pending', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  category: String,
  responses: [responseSchema],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('HelpTicket', ticketSchema);
