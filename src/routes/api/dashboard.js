const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const Sale = require('../../models/Sale');
const Product = require('../../models/Product');
const Customer = require('../../models/Customer');
const Transaction = require('../../models/Transaction');

// Get Dashboard Overview
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    // Get sales trends
    const salesTrends = await Sale.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$amount" }
        }
      },
      { $sort: { "_id": -1 } },
      { $limit: 30 }
    ]);

    // Get customer growth
    const customerGrowth = await Customer.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": -1 } },
      { $limit: 30 }
    ]);

    // Get popular products
    const productPopular = await Product.find()
      .sort('-sales')
      .limit(5)
      .select('name price sales status');

    // Get recent activities
    const recentActivities = await Transaction.find()
      .populate('productId', 'name')
      .populate('customerId', 'name')
      .sort('-createdAt')
      .limit(10);

    res.json({
      salesTrends: {
        weekly: salesTrends.slice(0, 7),
        monthly: salesTrends
      },
      customerGrowth,
      productPopular,
      recentActivities
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Dashboard Metrics
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const { timeRange = 'weekly' } = req.query;
    const dateRange = timeRange === 'weekly' ? 7 : 30;
    const previousRange = timeRange === 'weekly' ? 14 : 60;

    const [
      currentRevenue,
      previousRevenue,
      customerStats,
      transactionStats,
      productStats
    ] = await Promise.all([
      Sale.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000) }
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Sale.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - previousRange * 24 * 60 * 60 * 1000),
              $lt: new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000)
            }
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Customer.aggregate([
        {
          $facet: {
            total: [{ $count: "value" }],
            new: [
              {
                $match: {
                  createdAt: { $gte: new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000) }
                }
              },
              { $count: "value" }
            ]
          }
        }
      ]),
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total: { $sum: "$price" }
          }
        }
      ]),
      Product.aggregate([
        {
          $facet: {
            total: [{ $count: "value" }],
            outOfStock: [
              { $match: { status: "sold" } },
              { $count: "value" }
            ]
          }
        }
      ])
    ]);

    res.json({
      salesTarget: {
        current: currentRevenue[0]?.total || 0,
        target: 10000,
        percentage: ((currentRevenue[0]?.total || 0) / 10000) * 100,
        timeLeft: "2 weeks"
      },
      revenue: {
        value: currentRevenue[0]?.total || 0,
        previousValue: previousRevenue[0]?.total || 0,
        growth: ((currentRevenue[0]?.total || 0) - (previousRevenue[0]?.total || 0)) / (previousRevenue[0]?.total || 1) * 100
      },
      customers: {
        value: customerStats[0]?.total[0]?.value || 0,
        newCustomers: customerStats[0]?.new[0]?.value || 0,
        growth: 0
      },
      transactions: {
        value: transactionStats[0]?.count || 0,
        avgTicketSize: transactionStats[0] ? transactionStats[0].total / transactionStats[0].count : 0,
        growth: 0
      },
      products: {
        value: productStats[0]?.total[0]?.value || 0,
        outOfStock: productStats[0]?.outOfStock[0]?.value || 0,
        growth: 0 
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
