const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const Sale = require('../../models/Sale');
const Product = require('../../models/Product');

router.get('/report', authenticateToken, async (req, res) => {
  try {
    const { dateRange, region } = req.query;
    
    const now = new Date();
    let startDate, endDate;
    
    switch(dateRange) {
      case 'today':
        startDate = new Date(now.setHours(0,0,0,0));
        endDate = new Date(now.setHours(23,59,59,999));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        endDate = new Date();
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
    }

    // Use Sale model directly instead of SalesReport
    const [salesData, productData, regionalData] = await Promise.all([
      Sale.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
            totalTransactions: { $sum: 1 },
            avgTransactionValue: { $avg: "$amount" }
          }
        }
      ]),

      Sale.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'completed'
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
            _id: '$productId',
            name: { $first: '$product.username' },
            price: { $first: '$product.price' },
            status: { $first: '$product.status' },
            units: { $sum: 1 },
            revenue: { $sum: '$amount' }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 }
      ]),

      Sale.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'completed',
            region: { $exists: true }
          }
        },
        {
          $group: {
            _id: '$region',
            revenue: { $sum: '$amount' },
            transactions: { $sum: 1 }
          }
        }
      ])
    ]);

    const responseData = {
      summary: {
        totalRevenue: salesData[0]?.totalRevenue || 0,
        totalTransactions: salesData[0]?.totalTransactions || 0,
        totalCustomers: await Sale.distinct('customerId', {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }).then(customers => customers.length),
        totalTarget: 500000000,
        currentTarget: 231032444,
        revenueGrowth: 16.5,
        customerGrowth: 1.5,
        totalProducts: await Product.countDocuments(),
        productGrowth: -1.5
      },
      monthlySales: await Sale.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            revenue: { $sum: "$amount" },
            itemValue: { $avg: "$amount" }
          }
        },
        {
          $project: {
            month: {
              $arrayElemAt: [
                ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                { $subtract: [{ $month: { $dateFromString: { dateString: "$_id" } } }, 1] }
              ]
            },
            revenue: 1,
            itemValue: 1
          }
        },
        { $sort: { "_id": 1 } }
      ]),
      regionalData: regionalData.map(region => ({
        region: region._id,
        growth: 50, // Calculate actual growth based on previous period
        revenue: region.revenue,
        transactions: region.transactions
      })),
      popularProducts: productData
    };

    console.log('Sending report data:', responseData);
    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error fetching sales report:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;