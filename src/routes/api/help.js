const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeAdmin } = require('../../middleware/auth');
const HelpTicket = require('../../models/HelpTicket');
const Notification = require('../../models/Notification');
const User = require('../../models/User');

// Create ticket
router.post('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const ticket = new HelpTicket({
      ...req.body,
      customerId: req.user.userId,
      customerDetails: {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        profilePicture: user.profilePicture
      }
    });
    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get tickets and notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 10 } = req.query;
    const query = {};
    if (req.user.role !== 'admin') {
      query.customerId = req.user.userId;
    }

    if (status && status !== 'all') query.status = status;
    if (priority) query.priority = priority;

    const skip = (page - 1) * limit;
    
    const [tickets, notifications, totalTickets, stats] = await Promise.all([
      HelpTicket.find(query)
        .populate('assignedTo', 'firstName lastName email')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit)),
      Notification.find({ userId: req.user.userId })
        .sort('-createdAt')
        .limit(50),
      HelpTicket.countDocuments(query),
      HelpTicket.aggregate([
        { $match: { customerId: req.user.userId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Format stats
    const statsObject = {
      open: 0,
      pending: 0,
      resolved: 0,
      total: totalTickets
    };
    
    stats.forEach(stat => {
      statsObject[stat._id.toLowerCase()] = stat.count;
    });

    res.json({
      success: true,
      data: {
        tickets: tickets.map(ticket => ticket.toObject()),
        notifications: notifications.map(notification => ({
          ...notification.toObject(),
          _id: notification._id.toString(),
          createdAt: notification.createdAt.toISOString()
        })),
        stats: statsObject,
        meta: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalTickets / limit),
          totalItems: totalTickets
        }
      }
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fix the response endpoint
router.post('/:id/response', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const response = {
      message: req.body.message,
      sender: req.user.role === 'admin' ? 'admin' : 'customer',
      senderDetails: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role
      },
      timestamp: new Date()
    };

    const ticket = await HelpTicket.findOneAndUpdate(
      { 
        _id: req.params.id,
        $or: [
          { customerId: req.user.userId },
          { status: { $ne: 'closed' } }
        ]
      },
      { 
        $push: { responses: response },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    ).populate('customerId', 'firstName lastName email profilePicture');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found or unauthorized' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Add response error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: { read: true } },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update ticket status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can update ticket status' });
    }

    const ticket = await HelpTicket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const oldStatus = ticket.status;
    const newStatus = req.body.status;
    ticket.status = newStatus;
    await ticket.save();

    // Update stats
    if (oldStatus === 'resolved') {
      await HelpTicket.updateOne(
        {},
        { $inc: { 'stats.resolved': -1 } }
      );
    }
    if (newStatus === 'resolved') {
      await HelpTicket.updateOne(
        {},
        { $inc: { 'stats.resolved': 1 } }
      );
    }

    res.json(ticket);
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete ticket
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const ticket = await HelpTicket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Allow both admin and ticket owner to delete
    if (req.user.role !== 'admin' && ticket.customerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this ticket' });
    }

    // Use deleteOne instead of remove
    await HelpTicket.deleteOne({ _id: req.params.id });
    
    // Update stats if needed
    if (ticket.status) {
      await HelpTicket.updateOne(
        { _id: req.params.id },
        { $inc: { [`stats.${ticket.status.toLowerCase()}`]: -1, 'stats.total': -1 } }
      );
    }

    res.json({ 
      success: true,
      message: 'Ticket deleted successfully',
      deletedTicketId: req.params.id 
    });
  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({ 
      error: 'Failed to delete ticket',
      details: error.message 
    });
  }
});

router.get('/admin', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const tickets = await HelpTicket.find({})
      .populate('customerId', 'name email')
      .populate('assignedTo', 'firstName lastName email')
      .sort('-createdAt');
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const ticket = await HelpTicket.findOneAndUpdate(
      { _id: req.params.id, customerId: req.user.userId },
      { $set: req.body },
      { new: true }
    );
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
