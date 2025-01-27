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
    const { timeRange = 'monthly' } = req.query;
    const dateRange = timeRange === 'weekly' ? 7 : 30;
    const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);

    // Add status check to all aggregations
    const salesMatch = {
      createdAt: { $gte: startDate },
      status: 'completed'
    };

    const [salesData, regionalData, popularProducts, customerData, recentTransactions] = await Promise.all([
      // Sales Trends
      Sale.aggregate([
        {
          $match: salesMatch
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
            },
            revenue: { $sum: "$amount" },
            profit: { $sum: "$profit" },
            orders: { $sum: 1 }
          }
        },
        { $sort: { "_id.date": -1 } }
      ]),

      // Regional Data
      Sale.aggregate([
        {
          $match: salesMatch
        },
        {
          $group: {
            _id: "$region",
            revenue: { $sum: "$amount" },
            orders: { $sum: 1 }
          }
        }
      ]),

      // Popular Products
      Product.aggregate([
        {
          $match: { status: { $in: ['sold', 'available'] } }
        },
        {
          $lookup: {
            from: 'sales',
            localField: '_id',
            foreignField: 'productId',
            as: 'sales',
            pipeline: [{ $match: { status: 'completed' } }]
          }
        },
        {
          $addFields: {
            totalSales: { $size: '$sales' },
            totalRevenue: { $sum: '$sales.amount' }
          }
        },
        {
          $sort: { totalSales: -1, totalRevenue: -1 }
        },
        {
          $limit: 5
        },
        {
          $project: {
            username: 1,
            type: 1,
            price: 1,
            status: 1,
            totalSales: 1,
            totalRevenue: 1
          }
        }
      ]),

      // Customer Growth
      Customer.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
            },
            newCustomers: { $sum: 1 }
          }
        },
        { $sort: { "_id.date": -1 } }
      ]),

      // Recent Activities
      Transaction.find({
        createdAt: { $gte: startDate }
      })
      .populate('productId', 'username type price')
      .populate('customerId', 'name email')
      .sort('-createdAt')
      .limit(10)
      .lean()
    ]);

    const validatedResponse = {
      salesTrends: {
        daily: salesData.map(day => ({
          date: day._id.date,
          revenue: day.revenue || 0,
          profit: day.profit || 0,
          orders: day.orders || 0
        })),
        summary: {
          totalRevenue: salesData.reduce((sum, day) => sum + (day.revenue || 0), 0),
          totalProfit: salesData.reduce((sum, day) => sum + (day.profit || 0), 0),
          totalOrders: salesData.reduce((sum, day) => sum + (day.orders || 0), 0)
        }
      },
      regionalData: regionalData
        .filter(region => region._id)
        .map(region => ({
          region: region._id,
          revenue: region.revenue || 0,
          orders: region.orders || 0
        })),
      popularProducts: popularProducts
        .filter(product => product.totalSales > 0)
        .map(product => ({
          ...product,
          totalRevenue: product.totalRevenue || 0,
          totalSales: product.totalSales || 0
        })),
      customerGrowth: {
        daily: customerData,
        summary: {
          newCustomers: customerData.reduce((sum, day) => sum + (day.newCustomers || 0), 0)
        }
      },
      recentActivities: recentTransactions
    };

    res.json(validatedResponse);
  } catch (error) {
    console.error('Dashboard Overview Error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard overview',
      details: error.message
    });
  }
});

// Get Dashboard Metrics
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const { timeRange = 'weekly', compareWith = 'previous' } = req.query;
    const dateRange = timeRange === 'weekly' ? 7 : 30;
    const previousRange = timeRange === 'weekly' ? 14 : 60;

    const baseMatch = {
      status: 'completed',
      paymentStatus: 'paid'
    };

    const [
      currentRevenue,
      previousRevenue,
      customerStats,
      transactionStats,
      productStats
    ] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            ...baseMatch,
            createdAt: { $gte: new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $lookup: {
            from: 'sales',
            localField: '_id',
            foreignField: 'transactionId',
            as: 'sale'
          }
        },
        {
          $unwind: '$sale'
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
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

    // Add revenue targets calculation
    const targets = await calculateRevenueTargets(timeRange);
    const performanceMetrics = await calculatePerformanceMetrics(timeRange);

    res.json({
      salesTarget: {
        current: currentRevenue[0]?.total || 0,
        target: targets.currentTarget,
        percentage: ((currentRevenue[0]?.total || 0) / targets.currentTarget) * 100,
        timeLeft: targets.timeLeft
      },
      revenue: {
        value: currentRevenue[0]?.total || 0,
        previousValue: previousRevenue[0]?.total || 0,
        growth: calculateGrowthPercentage(
          currentRevenue[0]?.total,
          previousRevenue[0]?.total
        ),
        performance: performanceMetrics.revenue
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
    console.error('Dashboard Metrics Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard metrics',
      details: error.message 
    });
  }
});

// Helper functions
const calculateGrowthPercentage = (current, previous) => {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
};

const calculateRevenueTargets = async (timeRange) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    //To be implemented
    const monthlyTargets = {
      base: 10000,
      growth: 0.1,
      seasonalFactors: {
      0: 1.2,  // January
      1: 1.0,  // February
      2: 1.1,  // March
      3: 1.2,  // April
      4: 1.3,  // May
      5: 1.2,  // June
      6: 1.1,  // July
      7: 1.0,  // August
      8: 1.2,  // September
      9: 1.3,  // October
      10: 1.4, // November
      11: 1.5  // December
      }
    };

    // Calculate current month's target
    const baseTarget = monthlyTargets.base * 
      (1 + monthlyTargets.growth) ** (currentMonth) * 
      (monthlyTargets.seasonalFactors[currentMonth] || 1);

    const target = timeRange === 'weekly' ? baseTarget / 4 : baseTarget;

    const monthEnd = new Date(currentYear, currentMonth + 1, 0);
    const daysLeft = Math.ceil((monthEnd - currentDate) / (1000 * 60 * 60 * 24));
    
    return {
      currentTarget: Math.round(target),
      timeLeft: timeRange === 'weekly' ? 
        `${Math.min(7, daysLeft)} days` : 
        `${daysLeft} days`
    };
  } catch (error) {
    console.error('Error calculating revenue targets:', error);
    return { currentTarget: 10000, timeLeft: 'N/A' };
  }
};

const calculatePerformanceMetrics = async (timeRange) => {
  try {
    const dateRange = timeRange === 'weekly' ? 7 : 30;
    const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);

    const performanceData = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          dailyRevenue: { $sum: "$amount" }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);

    // Calculate trend
    const revenues = performanceData.map(d => d.dailyRevenue);
    const trend = revenues.length > 1 ? 
      revenues[revenues.length - 1] - revenues[0] : 
      0;

    // Calculate average and current performance
    const average = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const current = revenues[revenues.length - 1] || 0;

    return {
        trend: 'stable',
      revenue: {
        trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
        comparison: current > average ? 'above_average' : 
                   current < average ? 'below_average' : 'average',
        percentageFromAverage: average ? ((current - average) / average) * 100 : 0
      }
    };
  } catch (error) {
    console.error('Error calculating performance metrics:', error);
    return {
      revenue: {
        trend: 'stable',
        comparison: 'average',
        percentageFromAverage: 0
      }
    };
  }
};

module.exports = router;
