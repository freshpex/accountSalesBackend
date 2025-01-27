const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');
const SalesReport = require('../models/SalesReport');
const HelpTicket = require('../models/HelpTicket');

// Product Routes
router.post('/products', authenticateToken, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/products', authenticateToken, async (req, res) => {
  try {
    const { platform, status, sort = '-createdAt' } = req.query;
    const query = {};
    if (platform) query['socialAccount.platform'] = platform;
    if (status) query.status = status;
    
    const products = await Product.find(query).sort(sort);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transaction Routes
router.post('/transactions', authenticateToken, async (req, res) => {
  try {
    const transaction = new Transaction(req.body);
    await transaction.save();
    
    // Update product status if necessary
    if (req.body.type === 'social_account') {
      await Product.findByIdAndUpdate(req.body.productId, { status: 'sold' });
    }
    
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    const query = {};
    if (status) query.status = status;
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const transactions = await Transaction.find(query)
      .populate('productId')
      .populate('customerId')
      .sort('-createdAt');
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Customer Routes
router.get('/customers', authenticateToken, async (req, res) => {
  try {
    const { segment, status, sort = '-metrics.totalSpent' } = req.query;
    const query = {};
    if (segment) query.segment = segment;
    if (status) query.status = status;
    
    const customers = await Customer.find(query).sort(sort);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sales Report Routes
router.get('/sales-report', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {
      'period.start': { $gte: new Date(startDate) },
      'period.end': { $lte: new Date(endDate) }
    };
    
    const report = await SalesReport.findOne(query)
      .populate('products.productId');
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Help Ticket Routes
router.post('/help-tickets', authenticateToken, async (req, res) => {
  try {
    const ticket = new HelpTicket(req.body);
    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/help-tickets', authenticateToken, async (req, res) => {
  try {
    const { status, priority } = req.query;
    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    
    const tickets = await HelpTicket.find(query)
      .populate('customerId')
      .populate('assignedTo')
      .sort('-createdAt');
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/help-tickets/:id/responses', authenticateToken, async (req, res) => {
  try {
    const ticket = await HelpTicket.findById(req.params.id);
    ticket.responses.push(req.body);
    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
