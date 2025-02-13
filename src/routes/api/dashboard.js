const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const Sale = require('../../models/Sale');
const Product = require('../../models/Product');
const Customer = require('../../models/Customer');
const Transaction = require('../../models/Transaction');
const User = require('../../models/User');

// Get Dashboard Overview
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const { timeRange = 'monthly' } = req.query;
    const dateRange = timeRange === 'weekly' ? 7 : 30;
    const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);
    const previousStartDate = new Date(Date.now() - (dateRange * 2) * 24 * 60 * 60 * 1000);

    const [salesTrends, popularProducts, customerGrowth, recentActivities, regionalStats] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: 'completed',
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
            },
            revenue: { $sum: "$amount" },
            orders: { $sum: 1 },
            profit: { 
              $sum: { 
                $multiply: ["$amount", 0.2] 
              } 
            }
          }
        },
        {
          $project: {
            _id: 0,
            date: "$_id.date",
            revenue: 1,
            profit: 1,
            orders: 1
          }
        },
        { 
          $sort: { date: -1 } 
        }
      ]),

      // Popular products
      Product.aggregate([
        {
          $match: { status: 'sold' }
        },
        {
          $lookup: {
            from: 'transactions',
            localField: '_id',
            foreignField: 'productId',
            as: 'sales'
          }
        },
        {
          $project: {
            type: 1,
            username: 1,
            price: 1,
            totalSales: { $size: '$sales' },
            totalRevenue: { $sum: '$sales.amount' }
          }
        },
        { $sort: { totalSales: -1, totalRevenue: -1 } },
        { $limit: 5 }
      ]),

      // Customer growth
      User.aggregate([
        {
          $match: {
            role: 'user',
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

      // Recent activities
      Transaction.find({
        createdAt: { $gte: startDate },
        status: 'completed'
      })
      .populate('productId', 'username type price')
      .populate('customerId', 'firstName lastName email')
      .sort('-createdAt')
      .limit(10)
      .lean(),

      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: 'completed',
            paymentStatus: 'paid'
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $unwind: '$product'
        },
        {
          $group: {
            _id: '$product.region',
            currentRevenue: { $sum: '$amount' },
            orders: { $sum: 1 },
            products: { $addToSet: '$productId' }
          }
        },
        {
          $lookup: {
            from: 'transactions',
            let: { region: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$status', 'completed'] },
                      { $eq: ['$paymentStatus', 'paid'] },
                      {
                        $gte: ['$createdAt', previousStartDate]
                      },
                      {
                        $lt: ['$createdAt', startDate]
                      }
                    ]
                  }
                }
              },
              {
                $lookup: {
                  from: 'products',
                  localField: 'productId',
                  foreignField: '_id',
                  as: 'product'
                }
              },
              {
                $unwind: '$product'
              },
              {
                $match: {
                  $expr: {
                    $eq: ['$product.region', '$$region']
                  }
                }
              },
              {
                $group: {
                  _id: null,
                  previousRevenue: { $sum: '$amount' }
                }
              }
            ],
            as: 'previousPeriod'
          }
        },
        {
          $project: {
            region: '$_id',
            revenue: '$currentRevenue',
            orders: '$orders',
            productCount: { $size: '$products' },
            growth: {
              $multiply: [
                {
                  $divide: [
                    { $subtract: ['$currentRevenue', { $ifNull: [{ $arrayElemAt: ['$previousPeriod.previousRevenue', 0] }, 0] }] },
                    { $max: [{ $ifNull: [{ $arrayElemAt: ['$previousPeriod.previousRevenue', 0] }, 1] }, 1] }
                  ]
                },
                100
              ]
            }
          }
        },
        {
          $match: {
            region: { $ne: null }
          }
        },
        {
          $sort: { revenue: -1 }
        }
      ])
    ]);

    // Format the response with daily, weekly, and monthly data
    const formattedSalesTrends = {
      daily: salesTrends,
      weekly: salesTrends.slice(0, 7),
      monthly: salesTrends.slice(0, 30),
      summary: {
        totalRevenue: salesTrends.reduce((sum, day) => sum + (day.revenue || 0), 0),
        totalProfit: salesTrends.reduce((sum, day) => sum + (day.profit || 0), 0),
        totalOrders: salesTrends.reduce((sum, day) => sum + (day.orders || 0), 0),
        averageRevenue: salesTrends.length > 0 
          ? salesTrends.reduce((sum, day) => sum + day.revenue, 0) / salesTrends.length 
          : 0,
        averageOrders: salesTrends.length > 0
          ? salesTrends.reduce((sum, day) => sum + day.orders, 0) / salesTrends.length
          : 0
      }
    };

    // Add growth calculations
    if (salesTrends.length >= 2) {
      const currentPeriod = salesTrends.slice(0, Math.floor(salesTrends.length / 2));
      const previousPeriod = salesTrends.slice(Math.floor(salesTrends.length / 2));

      const currentRevenue = currentPeriod.reduce((sum, day) => sum + day.revenue, 0);
      const previousRevenue = previousPeriod.reduce((sum, day) => sum + day.revenue, 0);

      formattedSalesTrends.summary.growth = {
        revenue: previousRevenue ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0,
        orders: previousPeriod.length ? 
          ((currentPeriod.length - previousPeriod.length) / previousPeriod.length) * 100 : 0
      };
    }

    res.json({
      salesTrends: formattedSalesTrends,
      popularProducts,
      customerGrowth: {
        daily: customerGrowth,
        summary: {
          newCustomers: customerGrowth.reduce((sum, day) => sum + day.newCustomers, 0)
        }
      },
      regionalData: regionalStats.map(region => ({
        region: region.region || 'unknown',
        revenue: region.revenue,
        orders: region.orders,
        productCount: region.productCount,
        growth: parseFloat(region.growth.toFixed(2))
      })),
      recentActivities
    });

  } catch (error) {
    console.error('Dashboard Overview Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch overview', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get Dashboard Metrics
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const { timeRange = 'weekly' } = req.query;
    const dateRange = timeRange === 'weekly' ? 7 : 30;
    const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);
    const previousStartDate = new Date(Date.now() - (dateRange * 2) * 24 * 60 * 60 * 1000);

    const [currentMetrics, previousMetrics, customerData, productStats] = await Promise.all([
      // Current period metrics
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: 'completed',
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            transactionCount: { $sum: 1 },
            uniqueCustomers: { $addToSet: '$customerId' }
          }
        }
      ]),

      // Previous period metrics
      Transaction.aggregate([
        {
          $match: {
            createdAt: { 
              $gte: previousStartDate,
              $lt: startDate
            },
            status: 'completed',
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            transactionCount: { $sum: 1 }
          }
        }
      ]),

      // Customer metrics
      User.aggregate([
        {
          $match: {
            role: 'user'
          }
        },
        {
          $facet: {
            total: [{ $count: 'value' }],
            new: [
              {
                $match: {
                  createdAt: { $gte: startDate }
                }
              },
              { $count: 'value' }
            ],
            previousPeriod: [
              {
                $match: {
                  createdAt: {
                    $gte: previousStartDate,
                    $lt: startDate
                  }
                }
              },
              { $count: 'value' }
            ]
          }
        }
      ]),

      // Product metrics
      Product.aggregate([
        {
          $facet: {
            total: [{ $count: 'value' }],
            outOfStock: [
              { $match: { status: 'sold' } },
              { $count: 'value' }
            ],
            recentlySold: [
              {
                $match: {
                  status: 'sold',
                  updatedAt: { $gte: startDate }
                }
              },
              { $count: 'value' }
            ]
          }
        }
      ])
    ]);

    const current = currentMetrics[0] || { totalRevenue: 0, transactionCount: 0, uniqueCustomers: [] };
    const previous = previousMetrics[0] || { totalRevenue: 0, transactionCount: 0 };
    const customerMetrics = customerData[0] || { total: [{ value: 0 }], new: [{ value: 0 }] };
    const productMetrics = productStats[0] || { total: [{ value: 0 }], outOfStock: [{ value: 0 }] };

    // Calculate revenue target
    const targets = await calculateRevenueTargets(timeRange);
    
    res.json({
      salesTarget: {
        current: current.totalRevenue,
        target: targets.currentTarget,
        percentage: (current.totalRevenue / targets.currentTarget) * 100,
        timeLeft: targets.timeLeft
      },
      revenue: {
        value: current.totalRevenue,
        previousValue: previous.totalRevenue,
        growth: calculateGrowthPercentage(current.totalRevenue, previous.totalRevenue),
        performance: {
          trend: current.totalRevenue > previous.totalRevenue ? 'increasing' : 'decreasing',
          comparison: current.totalRevenue > previous.totalRevenue ? 'above_average' : 'below_average',
          percentageFromAverage: calculateGrowthPercentage(current.totalRevenue, previous.totalRevenue)
        }
      },
      customers: {
        value: customerMetrics.total[0]?.value || 0,
        newCustomers: customerMetrics.new[0]?.value || 0,
        growth: calculateGrowthPercentage(
          customerMetrics.new[0]?.value || 0,
          customerMetrics.previousPeriod[0]?.value || 0
        )
      },
      transactions: {
        value: current.transactionCount,
        avgTicketSize: current.transactionCount ? current.totalRevenue / current.transactionCount : 0,
        growth: calculateGrowthPercentage(current.transactionCount, previous.transactionCount)
      },
      products: {
        value: productMetrics.total[0]?.value || 0,
        outOfStock: productMetrics.outOfStock[0]?.value || 0,
        growth: calculateGrowthPercentage(
          productMetrics.recentlySold[0]?.value || 0,
          productMetrics.total[0]?.value || 1
        )
      }
    });

  } catch (error) {
    console.error('Dashboard Metrics Error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics', details: error.message });
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
