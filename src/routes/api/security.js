const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const UserProfile = require('../../models/UserProfile');
const User = require('../../models/User');
const { validatePassword } = require('../../utils/validation');
const bcrypt = require('bcryptjs');

// Get security settings including login history
router.get('/', authenticateToken, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.user.userId });
    if (!profile) {
      return res.status(404).json({ error: 'Security settings not found' });
    }
    res.json({
      success: true,
      data: profile.securitySettings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get login history
router.get('/login-history', authenticateToken, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.user.userId });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const loginHistory = profile.securitySettings?.loginHistory || [];
    res.json({
      success: true,
      data: loginHistory
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update password
router.post('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    await UserProfile.findOneAndUpdate(
      { userId: req.user.userId },
      { 'securitySettings.lastPasswordChange': new Date() }
    );

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle 2FA
router.post('/2fa/toggle', authenticateToken, async (req, res) => {
  try {
    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.user.userId },
      { 'securitySettings.twoFactorEnabled': req.body.enabled },
      { new: true }
    );
    
    res.json({ 
      success: true,
      enabled: profile.securitySettings.twoFactorEnabled 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;