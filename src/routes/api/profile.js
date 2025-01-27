const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const UserProfile = require('../../models/UserProfile');
const User = require('../../models/User');
const { profileUpload, uploadProfileToSupabase, uploadMiddleware } = require('../../middleware/profileUpload');

router.get('/', authenticateToken, async (req, res) => {
  try {
    // First try to find existing profile
    let profile = await UserProfile.findOne({ userId: req.user.userId });
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!profile) {
      // Create new profile with user data
      profile = await UserProfile.create({
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        notificationPreferences: {
          email: { newsUpdates: true, accountActivity: true, promotions: false },
          push: { newMessages: true, mentions: true, reminders: false },
          sms: { security: true, orders: false },
          browser: { desktop: true, sound: true, background: false }
        }
      });
    }

    // Combine profile data with user email and role
    const profileData = profile.toObject();
    profileData.email = user.email;
    profileData.role = user.role;

    res.json({
      success: true,
      data: profileData
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/', authenticateToken, async (req, res) => {
  try {
    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: req.body },
      { new: true, upsert: true }
    );
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/security', authenticateToken, async (req, res) => {
  try {
    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: { securitySettings: req.body } },
      { new: true }
    );
    res.json(profile.securitySettings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/notifications', authenticateToken, async (req, res) => {
  try {
    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: { notificationPreferences: req.body } },
      { new: true }
    );
    res.json(profile.notificationPreferences);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/profile-picture', 
  authenticateToken,
  uploadMiddleware,
  uploadProfileToSupabase,
  async (req, res) => {
    try {
      if (!req.fileUrl) {
        return res.status(400).json({ error: 'File upload failed' });
      }

      const profile = await UserProfile.findOneAndUpdate(
        { userId: req.user.userId },
        {
          $set: { profilePicture: req.fileUrl },
          $push: {
            profilePictureHistory: {
              url: req.fileUrl,
              uploadedAt: new Date()
            }
          }
        },
        { new: true }
      );

      res.json({
        success: true,
        url: profile.profilePicture
      });
    } catch (error) {
      console.error('Profile picture update error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete profile picture route
router.delete('/profile-picture', authenticateToken, async (req, res) => {
  try {
    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.user.userId },
      { 
        $set: { 
          profilePicture: null,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Profile picture removed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
