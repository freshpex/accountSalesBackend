const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeAdmin } = require('../../middleware/auth');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');

// Create a new customer
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, segment, status } = req.body;
    
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        error: 'Name and email are required'
      });
    }

    const customer = new User({
      name,
      email,
      phone,
      segment: segment || 'bronze',
      status: status || 'active',
      createdBy: req.user.id
    });

    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customers (non-admin users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { segment, status, sort = '-createdAt', page = 1, limit = 10 } = req.query;
    const query = { role: 'user' };
    
    if (segment && segment !== 'all') query.segment = segment;
    if (status && status !== 'all') query.status = status;

    const customers = await User.find(query)
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
      churnRate: 0 // Calculate based on your business logic
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
        items: customers.map(customer => ({
          id: customer._id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          businessName: customer.businessName,
          businessType: customer.businessType,
          status: customer.status,
          segment: customer.segment || 'unknown',
          metrics: customer.metrics || {},
          createdAt: customer.createdAt
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

// Get customer activity (transactions)
router.get('/:id/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    
    const transactions = await Transaction.find({ 
      customerId: userId 
    })
    .sort('-createdAt')
    .limit(10)
    .lean();

    const activity = transactions.map(t => ({
      id: t._id,
      type: 'purchase',
      details: `Purchased ${t.metadata?.productName || 'a product'}`,
      amount: t.amount,
      date: t.createdAt
    }));

    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single customer by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a customer by ID
router.put('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const customer = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a customer by ID
router.delete('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const customer = await User.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update customer segment
router.patch('/:id/segment', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { segment } = req.body;

    // Add validation for ID
    if (!id || id === 'undefined') {
      return res.status(400).json({
        success: false,
        error: 'Valid customer ID is required'
      });
    }

    // Validate segment value
    const validSegments = ['bronze', 'silver', 'gold', 'platinum'];
    if (!validSegments.includes(segment?.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid segment value'
      });
    }

    // Log the update attempt
    console.log('Attempting to update segment:', { id, segment });

    const updatedUser = await User.findOneAndUpdate(
      { 
        _id: id, 
        role: 'user'
      },
      { 
        segment: segment.toLowerCase(),
        'metrics.lastUpdated': new Date()
      },
      { 
        new: true,
        runValidators: true,
        select: '-password -passwordResetToken -passwordResetExpires'
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Get updated segments count
    const segments = {
      platinum: await User.countDocuments({ role: 'user', segment: 'platinum' }),
      gold: await User.countDocuments({ role: 'user', segment: 'gold' }),
      silver: await User.countDocuments({ role: 'user', segment: 'silver' }),
      bronze: await User.countDocuments({ role: 'user', segment: 'bronze' })
    };

    res.json({
      success: true,
      data: {
        customer: {
          ...updatedUser.toObject(),
          id: updatedUser._id // Ensure ID is included in response
        },
        segments
      }
    });

  } catch (error) {
    console.error('Segment update error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update customer segment'
    });
  }
});

module.exports = router;
