const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const UserProfile = require('../models/UserProfile');
const Notification = require('../models/Notification');
const rateLimit = require('express-rate-limit');

const dashboardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100
});

router.use(dashboardLimiter);

// Dashboard Overview Route - Main dashboard data
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('Fetching dashboard for user:', userId);

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const currentDate = new Date();
    const thirtyDaysAgo = new Date(currentDate - 30 * 24 * 60 * 60 * 1000);

    // Parallel fetch of all required data
    const [
      profile,
      recentTransactions,
      metrics,
      spendingHistory,
      notifications,
      securityStatus
    ] = await Promise.all([

      UserProfile.findOne({ userId }),

      // Get recent transactions
      Transaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('productId'),

      // Calculate metrics
      Transaction.aggregate([
        { $match: { userId: userId, status: 'completed' } },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$amount' },
            totalOrders: { $sum: 1 },
            avgOrderValue: { $avg: '$amount' }
          }
        }
      ]),

      // Get spending history (monthly)
      Transaction.aggregate([
        {
          $match: {
            userId: userId,
            status: 'completed',
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            total: { $sum: '$amount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),

      // Get unread notifications
      Notification.find({ 
        userId, 
        read: false 
      })
      .sort({ createdAt: -1 })
      .limit(5),

      // Calculate security score
      UserProfile.findOne({ userId })
        .select('securitySettings')
    ]);

    // Check if we have any data
    if (!profile && !recentTransactions.length && !metrics.length) {
      return res.json({
        success: true,
        data: {
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            segment: 'bronze',
            metrics: {
              totalSpent: 0,
              totalOrders: 0,
              avgOrderValue: 0
            }
          },
          recentActivity: [],
          spendingHistory: [],
          notifications: [],
          security: {
            score: 0,
            factors: {
              twoFactor: false,
              phoneVerified: false,
              emailVerified: false,
              passwordUpdated: false
            }
          }
        }
      });
    }

    // Calculate security score
    let securityScore = 0;
    if (securityStatus?.securitySettings) {
      if (securityStatus.securitySettings.twoFactorEnabled) securityScore += 40;
      if (securityStatus.securitySettings.lastPasswordChange) {
        const daysSinceChange = Math.floor(
          (Date.now() - securityStatus.securitySettings.lastPasswordChange) / 
          (1000 * 60 * 60 * 24)
        );
        if (daysSinceChange < 90) securityScore += 30;
      }
      if (profile?.phoneNumber) securityScore += 15;
      if (profile?.email) securityScore += 15;
    }

    res.json({
      success: true,
      data: {
        user: {
          ...profile?.toObject(),
          metrics: {
            totalSpent: metrics[0]?.totalSpent || 0,
            totalOrders: metrics[0]?.totalOrders || 0,
            avgOrderValue: metrics[0]?.avgOrderValue || 0
          }
        },
        recentActivity: recentTransactions.map(tx => ({
          id: tx._id,
          type: 'transaction',
          description: `Purchased ${tx.productId?.username || 'account'}`,
          amount: tx.amount,
          status: tx.status,
          date: tx.createdAt
        })),
        spendingHistory: spendingHistory.map(item => ({
          month: `${item._id.year}-${item._id.month}`,
          amount: item.total
        })),
        notifications: notifications.map(notif => ({
          id: notif._id,
          title: notif.title,
          message: notif.message,
          createdAt: notif.createdAt
        })),
        security: {
          score: securityScore,
          factors: {
            twoFactor: securityStatus?.securitySettings?.twoFactorEnabled || false,
            phoneVerified: !!profile?.phoneNumber,
            emailVerified: !!profile?.email,
            passwordUpdated: !!securityStatus?.securitySettings?.lastPasswordChange
          }
        }
      }
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard overview'
    });
  }
});

// Get user's transactions with filters
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 10,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = -1
    } = req.query;

    const query = { userId: req.user.userId };
    
    if (status && status !== 'all') {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [transactions, total, stats] = await Promise.all([
      Transaction.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('productId'),

      Transaction.countDocuments(query),

      Transaction.aggregate([
        { $match: { userId: req.user.userId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            total: { $sum: '$amount' }
          }
        }
      ])
    ]);

    // Format stats
    const statsObject = {
      all: total,
      completed: 0,
      pending: 0,
      failed: 0,
      totalAmount: 0
    };

    stats.forEach(stat => {
      statsObject[stat._id] = stat.count;
      if (stat._id === 'completed') {
        statsObject.totalAmount = stat.total;
      }
    });

    res.json({
      success: true,
      data: {
        transactions: transactions.map(tx => ({
          id: tx._id,
          productName: tx.productId?.username,
          amount: tx.amount,
          status: tx.status,
          date: tx.createdAt
        })),
        meta: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total
        },
        stats: statsObject
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's purchased products
router.get('/products', authenticateToken, async (req, res) => {
  try {
    const {
      type,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = -1
    } = req.query;

    // First get all user's transactions
    const transactions = await Transaction.find({
      userId: req.user.userId,
      status: 'completed'
    }).select('productId');

    const productIds = transactions.map(t => t.productId);

    const query = {
      _id: { $in: productIds }
    };

    if (type) query.type = type;
    if (status) query.status = status;

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(Number(limit)),

      Product.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        products,
        meta: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total
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

// Get notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user.userId
    })
    .sort({ createdAt: -1 })
    .limit(10);

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mark notification as read
router.patch('/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: { read: true } },
      { new: true }
    );

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get security status
router.get('/security', authenticateToken, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.user.userId });
    
    // Calculate security score
    let securityScore = 0;
    if (profile?.securitySettings) {
      if (profile.securitySettings.twoFactorEnabled) securityScore += 40;
      if (profile.securitySettings.lastPasswordChange) {
        const daysSinceChange = Math.floor(
          (Date.now() - profile.securitySettings.lastPasswordChange) / 
          (1000 * 60 * 60 * 24)
        );
        if (daysSinceChange < 90) securityScore += 30;
      }
      if (profile.phoneNumber) securityScore += 15;
      if (profile.email) securityScore += 15;
    }

    res.json({
      success: true,
      data: {
        score: securityScore,
        settings: profile?.securitySettings || {},
        lastLogin: profile?.securitySettings?.loginHistory?.[0]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add new aggregate endpoints for dashboard metrics
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const currentDate = new Date();
    const lastMonth = new Date(currentDate.setMonth(currentDate.getMonth() - 1));

    const [currentMetrics, previousMetrics, userSegment] = await Promise.all([
      // Current month metrics
      Transaction.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: lastMonth },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$amount' },
            totalOrders: { $sum: 1 },
            averageSpending: { $avg: '$amount' }
          }
        }
      ]),

      // Previous month metrics for growth calculation
      Transaction.aggregate([
        {
          $match: {
            userId,
            createdAt: {
              $gte: new Date(lastMonth.setMonth(lastMonth.getMonth() - 1)),
              $lt: lastMonth
            },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$amount' },
            totalOrders: { $sum: 1 }
          }
        }
      ]),

      // Get user segment info
      User.findById(userId).select('segment metrics')
    ]);

    // Calculate growth percentages
    const current = currentMetrics[0] || { totalSpent: 0, totalOrders: 0 };
    const previous = previousMetrics[0] || { totalSpent: 0, totalOrders: 0 };

    const spendingGrowth = previous.totalSpent ? 
      ((current.totalSpent - previous.totalSpent) / previous.totalSpent) * 100 : 0;
    
    const ordersGrowth = previous.totalOrders ?
      ((current.totalOrders - previous.totalOrders) / previous.totalOrders) * 100 : 0;

    res.json({
      success: true,
      data: {
        current: {
          totalSpent: current.totalSpent,
          totalOrders: current.totalOrders,
          averageSpending: current.averageSpending || 0
        },
        growth: {
          spending: spendingGrowth.toFixed(2),
          orders: ordersGrowth.toFixed(2)
        },
        segment: userSegment?.segment || 'bronze',
        metrics: userSegment?.metrics || {
          totalSpent: 0,
          totalOrders: 0,
          lastOrderDate: null
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

// Get spending chart data
router.get('/spending-chart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const months = 6; // Last 6 months

    const spendingData = await Transaction.aggregate([
      {
        $match: {
          userId,
          status: 'completed',
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - months))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format data for chart
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const chartData = {
      labels: spendingData.map(d => monthNames[d._id.month - 1]),
      datasets: [{
        label: 'Monthly Spending',
        data: spendingData.map(d => d.total)
      }]
    };

    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recent activity
router.get('/recent-activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [transactions, securityEvents] = await Promise.all([
      // Recent transactions
      Transaction.find({ userId })
        .sort('-createdAt')
        .limit(5)
        .populate('productId', 'username type'),

      // Security events from user profile
      UserProfile.findOne({ userId })
        .select('securitySettings.loginHistory')
    ]);

    // Combine and sort activities
    const activities = [
      ...transactions.map(tx => ({
        type: 'transaction',
        description: `Purchased ${tx.productId?.username || 'account'}`,
        time: tx.createdAt,
        amount: tx.amount,
        status: tx.status
      })),
      ...(securityEvents?.securitySettings?.loginHistory || []).map(event => ({
        type: 'security',
        description: `Login from ${event.device}`,
        time: event.timestamp,
        location: event.location
      }))
    ].sort((a, b) => b.time - a.time).slice(0, 10);

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update last seen
router.post('/update-last-seen', authenticateToken, async (req, res) => {
  try {
    const { device, location } = req.body;

    await UserProfile.findOneAndUpdate(
      { userId: req.user.userId },
      {
        $push: {
          'securitySettings.loginHistory': {
            $each: [{
              device,
              location,
              timestamp: new Date()
            }],
            $slice: -10
          }
        }
      }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
