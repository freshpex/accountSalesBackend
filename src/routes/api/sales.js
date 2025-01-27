const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const SalesReport = require('../../models/SalesReport');
const Transaction = require('../../models/Transaction');
const Product = require('../../models/Product');
const User = require('../../models/User');

router.get('/report', authenticateToken, async (req, res) => {
  try {
    const { dateRange, region } = req.query;
    
    // Get the date range
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

    // First try to get existing report
    let report = await SalesReport.findOne()
      .sort({ 'period.end': -1 })
      .populate({
        path: 'products.productId',
        select: 'username price status'
      })
      .populate({
        path: 'transactions',
        select: 'amount status createdAt'
      });

    let responseData;

    if (report) {
      // Use existing report but update with latest transaction data
      const latestTransactions = await Transaction.find({
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'completed'
      });

      const totalRevenue = latestTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      responseData = {
        summary: {
          ...report.summary,
          totalRevenue: totalRevenue || report.summary.totalRevenue,
          totalTransactions: latestTransactions.length || report.summary.totalTransactions
        },
        monthlySales: report.monthlySales,
        regionalData: region === 'all' ? report.regionalData : 
          report.regionalData.filter(r => r.region.toLowerCase() === region.toLowerCase()),
        popularProducts: report.products.map(p => ({
          id: p.productId._id,
          name: p.productId.username,
          price: p.productId.price,
          status: p.productId.status,
          units: p.units,
          revenue: p.revenue,
          growth: p.growth
        }))
      };
    } else {
      // Generate new report only if no existing report
      const [transactions, products] = await Promise.all([
        Transaction.find({
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }).populate('productId'),
        Product.find({ status: 'sold' })
      ]);

      const monthlyData = await Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: { $month: '$createdAt' },
            revenue: { $sum: '$amount' },
            itemValue: { $avg: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      responseData = {
        summary: {
          totalRevenue: transactions.reduce((sum, t) => sum + t.amount, 0),
          totalTransactions: transactions.length,
          totalProducts: products.length,
          currentTarget: 231032444,
          totalTarget: 500000000,
          revenueGrowth: 16.5,
          customerGrowth: 1.5,
          productGrowth: -1.5
        },
        monthlySales: monthlyData.map(m => ({
          month: monthNames[m._id - 1],
          revenue: m.revenue,
          itemValue: m.itemValue
        })),
        regionalData: region === 'all' ? [] : [{
          region: region,
          growth: 50
        }],
        popularProducts: products.slice(0, 5).map(p => ({
          id: p._id,
          name: p.username,
          price: p.price,
          status: p.status,
          units: 0,
          revenue: 0,
          growth: 0
        }))
      };

      // Save new report
      report = new SalesReport({
        period: { start: startDate, end: endDate },
        ...responseData,
        products: responseData.popularProducts.map(p => ({
          productId: p.id,
          units: p.units,
          revenue: p.revenue,
          growth: p.growth
        }))
      });
      await report.save();
    }

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