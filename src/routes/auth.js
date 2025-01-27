const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/email');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');
const sendNotification = require('../utils/notification');
const { logLoginActivity } = require('../middleware/activityLogger');
const passport = require('passport');

// Register
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, businessName, businessType, phoneNumber } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ 
        error: 'User already exists',
        body: { email: 'Email already registered' }
      });
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      businessName,
      businessType,
      phoneNumber
    });

    // Send welcome email
    await sendEmail({
      to: email,
      subject: 'Welcome to ScottTech',
      template: 'welcome',
      context: { 
        name: firstName,
        email: email,
        time: new Date().toLocaleString()
      }
    });

    // Send welcome notification
    await sendNotification(user._id, 'Welcome to ScotTech!', 'Thank you for registering with us.');

    res.status(201).json({
      message: 'Registration successful',
      userId: user._id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email });
    
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const isValidPassword = await user.comparePassword(password);
    console.log('Password validation:', { isValid: isValidPassword });

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Send sign-in alert
    await sendEmail({
      to: email,
      subject: 'New Sign-in Alert',
      template: 'signinAlert',
      context: { 
        name: user.firstName,
        time: new Date().toLocaleString(),
        location: req.headers['x-forwarded-for'] || req.ip,
        device: req.headers['user-agent']
      }
    });

    // Send sign-in notification
    await sendNotification(user._id, 'Sign-In Alert', `You signed in at ${new Date().toLocaleString()}`);

    // Log login activity
    await logLoginActivity(
      user._id,
      req.headers['user-agent'] || 'Unknown Device',
      req.ip
    );

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        userToken: token,
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      }
    });

    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.passwordResetExpires = Date.now() + 30 * 60 * 1000;
    await user.save();

    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    // Send password reset email
    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      template: 'resetPassword',
      context: { 
        name: user.firstName,
        resetURL,
        time: new Date().toLocaleString()
      }
    });

    // Send password reset notification
    await sendNotification(user._id, 'Password Reset Request', 'A password reset request was made for your account.');

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset Password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logout
router.post('/logout', authenticateToken, (req, res) => {
  req.user = null;
  res.json({ message: 'Logout successful' });
});

// Get users (non-admin users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { segment, status, sort = '-createdAt', page = 1, limit = 10 } = req.query;
    const query = { role: 'user' };
    
    if (segment && segment !== 'all') query.segment = segment;
    if (status && status !== 'all') query.status = status;

    const users = await User.find(query)
      .select('-password -passwordResetToken -passwordResetExpires')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    // Get metrics
    const metrics = {
      totalCustomers: total,
      activeCustomers: await User.countDocuments({ role: 'user', status: 'active' }),
      newCustomers: await User.countDocuments({
        role: 'user',
        createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) }
      }),
      churnRate: 0
    };

    // Get segments count for non-admin users
    const segments = {
      platinum: await User.countDocuments({ role: 'user', segment: 'platinum' }),
      gold: await User.countDocuments({ role: 'user', segment: 'gold' }),
      silver: await User.countDocuments({ role: 'user', segment: 'silver' }),
      bronze: await User.countDocuments({ role: 'user', segment: 'bronze' })
    };

    const response = {
      success: true,
      data: {
        items: users.map(user => ({
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          businessName: user.businessName,
          businessType: user.businessType,
          status: user.status,
          segment: user.segment,
          metrics: user.metrics || {},
          createdAt: user.createdAt
        })),
        meta: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total
        },
        metrics,
        segments
      }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Google Auth Routes
router.get('/auth/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account',
    callbackURL: `${process.env.BACKEND_URL}/api/v1/user/auth/google/callback`
  })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=Google authentication failed`
  }),
  async (req, res) => {
    try {
      const token = jwt.sign(
        { userId: req.user._id, email: req.user.email, role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Send sign-in alert for Google authentication
      await sendEmail({
        to: req.user.email,
        subject: 'New Sign-in with Google Alert',
        template: 'signinAlert',
        context: { 
          name: req.user.firstName,
          time: new Date().toLocaleString(),
          location: req.headers['x-forwarded-for'] || req.ip,
          device: req.headers['user-agent'],
          method: 'Google Sign-In'
        }
      });

      // Send sign-in notification
      await sendNotification(req.user._id, 'Google Sign-In Alert', `You signed in with Google at ${new Date().toLocaleString()}`);

      // Log login activity
      await logLoginActivity(
        req.user._id,
        req.headers['user-agent'] || 'Unknown Device',
        req.ip
      );

      res.redirect(`${process.env.FRONTEND_URL}/auth/google/callback?token=${token}`);
    } catch (error) {
      console.error('Google auth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=Authentication failed`);
    }
  }
);

// Complete Profile
router.post('/complete-profile', async (req, res) => {
  try {
    const { token, businessName, businessType, phoneNumber } = req.body;
    
    // Verify token and get user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user profile
    user.businessName = businessName;
    user.businessType = businessType;
    user.phoneNumber = phoneNumber;
    await user.save();

    res.json({
      success: true,
      message: 'Profile completed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
