const cron = require('node-cron');
const SalesReport = require('../models/SalesReport');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const User = require('../models/User');

cron.schedule('0 0 * * *', async () => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [transactions, products, customers] = await Promise.all([
      Transaction.find({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        status: 'completed'
      }),
      Product.find({ status: 'sold' }),
      User.find({ role: 'user' })
    ]);

    const report = new SalesReport({
      period: { start: startOfMonth, end: endOfMonth },
      transactions: transactions.map(t => t._id),
      products: products.map(p => ({
        productId: p._id,
        units: 1,
        revenue: p.price
      })),
      customers: customers.map(c => c._id),
      // ... other fields ...
    });

    await report.save();
    console.log('Sales report updated successfully');
  } catch (error) {
    console.error('Error updating sales report:', error);
  }
});
