const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const Notification = require('../../models/Notification');
const UserProfile = require('../../models/UserProfile');

// Get all notifications for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, filter } = req.query;
    const query = { userId: req.user.userId };
    
    if (filter === 'unread') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: {
        notifications,
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/read', authenticateToken, async (req, res) => {
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

// Toggle notification setting
router.post('/toggle', authenticateToken, async (req, res) => {
  try {
    const { type, setting, value } = req.body;
    
    // Validate type and setting
    const validTypes = ['email', 'push', 'sms', 'browser'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid notification type' });
    }

    const updateField = `notificationPreferences.${type}.${setting}`;
    
    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: { [updateField]: value } },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      success: true,
      data: {
        type,
        setting,
        value,
        preferences: profile.notificationPreferences
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/settings', authenticateToken, async (req, res) => {
  try {
    let profile = await UserProfile.findOne({ userId: req.user.userId });
    
    if (!profile) {
      profile = await UserProfile.create({
        userId: req.user.userId,
        notificationPreferences: {
          email: {
            newsUpdates: false,
            accountActivity: false,
            promotions: false
          },
          push: {
            newMessages: false,
            mentions: false,
            reminders: false
          },
          sms: {
            security: false,
            orders: false
          },
          browser: {
            desktop: false,
            sound: false,
            background: false
          }
        }
      });
    }

    res.json({
      success: true,
      data: profile.notificationPreferences
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
