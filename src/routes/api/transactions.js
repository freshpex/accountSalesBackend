const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, authorizeAdmin } = require('../../middleware/auth');
const Transaction = require('../../models/Transaction');
const Product = require('../../models/Product');
const Escrow = require('../../models/Escrow');
const sendEmail = require('../../utils/email');
const sendNotification = require('../../utils/notification');
const flw = require('../../config/flutterwave');
const User = require('../../models/User');
const UserProfile = require('../../models/UserProfile');
const axios = require('axios');

const normalizePaymentMethod = (method) => {
  const methodMap = {
    'bank_transfer': 'banktransfer',
    'card': 'card',
    'ussd': 'ussd'
  };
  return methodMap[method] || method;
};

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { productId, amount, metadata } = req.body;
    const validationErrors = {};

    // Find user and profile
    const user = await User.findById(req.user.userId);
    const userProfile = await UserProfile.findOne({ userId: req.user.userId });

    if (!user || !userProfile) {
      return res.status(400).json({
        error: 'User profile not found',
        details: 'User profile must exist to create transactions'
      });
    }

    // Validate inputs
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      validationErrors.productId = 'Valid Product ID is required';
    }
    
    if (!amount || amount <= 0) {
      validationErrors.amount = 'Valid amount is required';
    }

    if (!metadata?.customerName) {
      validationErrors.customerName = 'Customer name is required';
    }

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }

    const transaction = new Transaction({
      ...req.body,
      userId: user._id,
      customerId: userProfile._id,
      customerDetails: {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: userProfile.phoneNumber,
        address: userProfile.address,
        country: userProfile.country
      }
    });

    await transaction.save();
    
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('productId')
      .populate({
        path: 'customerId',
        select: 'userId firstName lastName email'
      });

    res.status(201).json(populatedTransaction);
  } catch (error) {
    console.error('Transaction creation error:', error);
    res.status(400).json({
      error: 'Failed to create transaction',
      details: error.message
    });
  }
});

// Modify the GET endpoint to handle user-specific transactions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = -1 } = req.query;
    const query = {};
    
    // Enhanced filtering
    if (req.user.role !== 'admin') {
      query.userId = req.user.userId;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { 'customerDetails.name': { $regex: search, $options: 'i' } },
        { 'customerDetails.email': { $regex: search, $options: 'i' } },
        { 'metadata.productName': { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .populate('productId')
      .populate('customerId', 'firstName lastName email')
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean()
      .exec() // Add explicit exec()
      .then(docs => docs.map(doc => ({
        id: doc._id,
        transactionId: doc.transactionId,
        productId: doc.productId?._id,
        productName: doc.metadata?.productName || doc.productId?.name,
        productImage: doc.productId?.images?.[0],
        productType: doc.productId?.type,
        amount: doc.amount,
        amountInNaira: doc.amountInNaira,
        currency: doc.currency,
        paymentMethod: doc.paymentMethod,
        paymentStatus: doc.paymentStatus || 'unpaid',
        status: doc.status,
        customerDetails: doc.customerDetails || {
          name: doc.metadata?.customerName,
          email: doc.customerId?.email
        },
        metadata: doc.metadata || {},
        notes: doc.notes || '',
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        escrowId: doc.escrowId,
        flutterwaveReference: doc.flutterwaveReference
      })));

    // Enhanced statistics
    const stats = {
      all: await Transaction.countDocuments(query),
      pending: await Transaction.countDocuments({ ...query, status: 'pending' }),
      completed: await Transaction.countDocuments({ ...query, status: 'completed' }),
      cancelled: await Transaction.countDocuments({ ...query, status: 'cancelled' }),
      processing: await Transaction.countDocuments({ ...query, status: 'processing' }),
      totalAmount: await Transaction.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).then(result => result[0]?.total || 0)
    };

    res.json({
      items: transactions,
      meta: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: Number(limit)
      },
      stats
    });
  } catch (error) {
    console.error('Transaction fetch error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.get('/admin', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const transactions = await Transaction.find({})
      .populate('productId')
      .populate('customerId', 'name email')
      .sort('-createdAt');
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/status', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { $set: { status: req.body.status } },
      { new: true }
    );
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add DELETE endpoint
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        error: 'Invalid transaction ID format' 
      });
    }

    const transaction = await Transaction.findById(id);
    
    if (!transaction) {
      return res.status(404).json({ 
        error: 'Transaction not found' 
      });
    }

    // Check if user owns the transaction or is admin
    if (transaction.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Not authorized to delete this transaction' 
      });
    }

    await Transaction.findByIdAndDelete(id);

    res.json({ 
      message: 'Transaction deleted successfully',
      id 
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ 
      error: 'Failed to delete transaction',
      details: error.message 
    });
  }
});

// Add PUT endpoint for updating transactions
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid transaction ID format' });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Check authorization
    if (transaction.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this transaction' });
    }

    // Update allowed fields only
    const allowedUpdates = {
      status: req.body.status,
      paymentStatus: req.body.paymentStatus,
      paymentMethod: req.body.paymentMethod,
      notes: req.body.notes,
      amount: req.body.amount,
      metadata: req.body.metadata
    };

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    ).populate('productId');

    res.json(updatedTransaction);
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(400).json({
      error: 'Failed to update transaction',
      details: error.message
    });
  }
});

// Initiate purchase
router.post('/initiate', authenticateToken, async (req, res) => {
  try {
    const { productId, paymentMethod, email, name, phone } = req.body;

    if (!productId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Product ID and payment method are required'
      });
    }

    const product = await Product.findOne({
      _id: productId,
      status: 'available'
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found or not available'
      });
    }

    // Create transaction
    const transaction = new Transaction({
      productId,
      customerId: req.user.userId,
      amount: product.price,
      paymentMethod,
      status: 'pending',
      paymentStatus: 'pending',
      metadata: {
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        productName: product.username
      }
    });

    await transaction.save();

    // Initialize payment with Flutterwave
    const paymentData = {
      tx_ref: transaction._id.toString(),
      amount: product.price,
      currency: 'NGN',
      redirect_url: `${process.env.FRONTEND_URL}/payment/callback`,
      payment_options: 'card,banktransfer,ussd',
      meta: {
        consumer_id: req.user.userId,
        consumer_mac: transaction._id.toString(),
      },
      customer: {
        email,
        phonenumber: phone,
        name
      },
      customizations: {
        title: `Purchase ${product.username}`,
        description: `Payment for ${product.type} account`,
        logo: process.env.LOGO_URL
      }
    };

    const response = await flutterwaveAPI.post('/payments', paymentData);

    console.log('Flutterwave response:', response.data);

    // Send escrow request email to seller
    await sendEmail({
      to: product.sellerEmail,
      subject: 'New Escrow Request',
      template: 'escrowRequest',
      context: {
        name: product.sellerName,
        buyerName: `${req.user.firstName} ${req.user.lastName}`,
        productName: product.username,
        amount: product.price,
        escrowId: escrow._id
      }
    });

    res.json({
      success: true,
      transactionId: transaction._id,
      paymentUrl: response.data.data.link
    });

  } catch (error) {
    console.error('Purchase initiation error:', error);
    res.status(500).json({
      error: 'Failed to initiate purchase',
      details: error.response?.data?.message || error.message
    });
  }
});

// Handle payment callback
router.post('/callback', async (req, res) => {
  try {
    const { transaction_id, tx_ref, status, meta } = req.body;
    console.log('Payment callback received:', { transaction_id, tx_ref, status, meta });

    // Check for existing transaction first
    let transaction = await Transaction.findOne({
      $or: [
        { transactionId: transaction_id },
        { tx_ref: tx_ref }
      ]
    });

    if (transaction) {
      // Update existing transaction
      transaction.status = status === 'completed' ? 'completed' : transaction.status;
      transaction.paymentStatus = status === 'completed' ? 'paid' : transaction.paymentStatus;
      transaction.meta = { ...transaction.meta, ...meta };
    } else {
      // Create new transaction with validated data
      transaction = new Transaction({
        transactionId: transaction_id,
        tx_ref: tx_ref,
        userId: meta.userId,
        customerId: meta.customerId,
        productId: meta.productId,
        amount: meta.amount || 0,
        status: status === 'completed' ? 'completed' : 'pending',
        paymentStatus: status === 'completed' ? 'paid' : 'unpaid',
        paymentMethod: 'flutterwave',
        meta
      });
    }

    await transaction.save();
    
    // If completed, update product status
    if (status === 'completed' && meta.productId) {
      await Product.findByIdAndUpdate(meta.productId, {
        status: 'sold'
      });
    }

    return res.json({
      success: true,
      transaction: {
        id: transaction._id,
        transactionId: transaction.transactionId,
        status: transaction.status,
        tx_ref: transaction.tx_ref
      }
    });
  } catch (error) {
    console.error('Payment callback error:', error);
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
        transaction: await Transaction.findOne({
          $or: [
            { transactionId: req.body.transaction_id },
            { tx_ref: req.body.tx_ref }
          ]
        })
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Escrow request route
router.post('/escrow', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.body;
    
    // Debug log to check user data
    console.log('User from auth:', req.user);
    
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        error: 'User authentication required' 
      });
    }

    const product = await Product.findById(productId);
      
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Create escrow record
    const escrow = new Escrow({
      productId,
      buyerId: req.user.userId,
      amount: product.price,
      status: 'pending',
      metadata: new Map([
        ['productName', product.username],
        ['buyerEmail', req.user.email],
        ...(req.user.name ? [['buyerName', req.user.name]] : []),
        ...(req.user.firstName ? [['buyerName', `${req.user.firstName} ${req.user.lastName || ''}`]] : [])
      ])
    });

    console.log('Escrow data before save:', escrow);

    await escrow.save();

    res.json({
      success: true,
      escrowId: escrow._id
    });

  } catch (error) {
    console.error('Escrow request error:', error);
    res.status(500).json({
      error: 'Failed to create escrow request',
      details: error.message
    });
  }
});

// Payment callback route
router.post('/callback', async (req, res) => {
  try {
    const { transaction_id, tx_ref } = req.body;

    // Verify transaction with Flutterwave
    const response = await flw.Transaction.verify({ id: transaction_id });
    
    if (response.data.status === 'successful') {
      // Update transaction
      const transaction = await Transaction.findById(tx_ref)
        .populate('productId')
        .populate('customerId', 'email name');

      // Update transaction and product status
      transaction.status = 'completed';
      transaction.paymentStatus = 'paid';
      await transaction.save();

      await Product.findByIdAndUpdate(
        transaction.productId,
        { status: 'sold' }
      );

      // Send confirmation email to buyer
      await sendEmail({
        to: transaction.customerId.email,
        subject: 'Payment Confirmation',
        template: 'paymentSuccess',
        context: {
          name: transaction.customerId.name,
          productName: transaction.productId.username,
          amount: transaction.amount,
          transactionId: transaction.transactionId,
          date: new Date().toLocaleDateString()
        }
      });

      // Send notification to buyer
      await sendNotification(
        transaction.customerId._id,
        'Payment Successful',
        `Your payment for ${transaction.productId.username} has been confirmed`
      );

      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Payment verification failed' });
    }

  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(500).json({
      error: 'Failed to process payment callback',
      details: error.message
    });
  }
});

// Add verification middleware
const verifyFlutterwaveWebhook = (req, res, next) => {
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
  const signature = req.headers["verif-hash"];
  
  if (!signature || signature !== secretHash) {
    return res.status(401).json({
      error: 'Invalid webhook signature'
    });
  }
  next();
};

// Add Flutterwave webhook handler
router.post('/webhook', verifyFlutterwaveWebhook, async (req, res) => {
  try {
    const eventData = req.body;
    
    if (eventData.event === 'charge.completed') {
      const transaction = await Transaction.findById(eventData.data.tx_ref)
        .populate('productId')
        .populate('customerId', 'email name');
      
      transaction.status = 'completed';
      transaction.paymentStatus = 'paid';
      await transaction.save();

      await Product.findByIdAndUpdate(
        transaction.productId,
        { status: 'sold' }
      );

      // Send notifications
      await Promise.all([
        // Notify buyer
        sendNotification(
          transaction.customerId._id,
          'Transaction Complete',
          `Your purchase of ${transaction.productId.username} is complete`
        ),
        // Notify seller
        sendNotification(
          transaction.productId.sellerId,
          'Product Sold',
          `Your product ${transaction.productId.username} has been sold`
        ),
        // Email buyer
        sendEmail({
          to: transaction.customerId.email,
          subject: 'Transaction Complete',
          template: 'transactionComplete',
          context: {
            name: transaction.customerId.name,
            productName: transaction.productId.username,
            amount: transaction.amount,
            transactionId: transaction.transactionId
          }
        })
      ]);

      // Send payment success email
      await sendEmail({
        to: transaction.customerDetails.email,
        subject: 'Payment Successful',
        template: 'paymentSuccess',
        context: {
          name: transaction.customerDetails.name,
          productName: transaction.productId.username,
          amount: transaction.amount,
          transactionId: transaction.transactionId,
          date: new Date().toLocaleString(),
          paymentMethod: eventData.data.payment_type
        }
      });

      // Send transaction complete email
      await sendEmail({
        to: transaction.customerDetails.email,
        subject: 'Transaction Complete',
        template: 'transactionComplete',
        context: {
          name: transaction.customerDetails.name,
          productName: transaction.productId.username,
          amount: transaction.amount,
          transactionId: transaction.transactionId
        }
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      error: 'Failed to process webhook',
      details: error.message
    });
  }
});

// Payment verification endpoint
router.get('/verify/:transactionId', authenticateToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { transaction_id } = req.query;

    if (!transaction_id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    // Verify payment with Flutterwave
    const response = await flutterwaveAPI.get(`/transactions/${transaction_id}/verify`);
    const paymentData = response.data.data;

    if (paymentData.status === 'successful') {
      // Update transaction
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      // Verify amount
      if (paymentData.amount >= transaction.amountInNaira) {
        transaction.status = 'completed';
        transaction.paymentStatus = 'paid';
        transaction.flutterwaveReference = paymentData.flw_ref;
        await transaction.save();

        // Update product status
        await Product.findByIdAndUpdate(
          transaction.productId,
          { status: 'sold' }
        );

        return res.json({
          success: true,
          message: 'Payment verified successfully',
          transaction
        });
      } else {
        return res.status(400).json({
          error: 'Payment amount mismatch'
        });
      }
    }

    res.status(400).json({
      error: 'Payment verification failed'
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      error: 'Failed to verify payment',
      details: error.response?.data?.message || error.message
    });
  }
});

// Initiate transaction
router.post('/initiate', authenticateToken, async (req, res) => {
  try {
    const { productId, amount, metadata } = req.body;

    // Create transaction with generated ID
    const transaction = new Transaction({
      productId,
      customerId: req.user._id,
      amount,
      status: 'pending',
      paymentStatus: 'pending',
      metadata: {
        ...metadata,
        customerName: req.user.name,
        customerEmail: req.user.email
      }
    });

    await transaction.save();

    res.json({
      success: true,
      transactionId: transaction.transactionId
    });
  } catch (error) {
    console.error('Transaction initiation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Handle payment callback
router.post('/callback', async (req, res) => {
  try {
    const { transaction_id, tx_ref } = req.body;

    if (!transaction_id || !tx_ref) {
      return res.status(400).json({
        success: false,
        error: 'Missing transaction parameters'
      });
    }

    // Find transaction by transactionId (not _id)
    const transaction = await Transaction.findOne({ transactionId: tx_ref })
      .populate('productId')
      .populate('customerId', 'email name');

    if (!transaction) {
      throw new Error(`Transaction not found with ID: ${tx_ref}`);
    }

    // Verify with Flutterwave
    const response = await flw.Transaction.verify({ id: transaction_id });
    console.log('Flutterwave verification response:', response);

    if (response.data.status === 'successful') {
      // Update transaction
      transaction.status = 'completed';
      transaction.paymentStatus = 'paid';
      transaction.flwReference = response.data.flw_ref;
      await transaction.save();

      // Update product status
      await Product.findByIdAndUpdate(
        transaction.productId._id,
        { status: 'sold' }
      );

      // Send notifications
      try {
        await sendEmail({
          to: transaction.customerId.email,
          subject: 'Payment Confirmation',
          template: 'paymentSuccess',
          context: {
            name: transaction.customerId.name,
            productName: transaction.productId.username,
            amount: transaction.amount,
            transactionId: transaction.transactionId,
            date: new Date().toLocaleDateString()
          }
        });
      } catch (emailError) {
        console.error('Email notification error:', emailError);
      }

      return res.json({
        success: true,
        transaction: {
          id: transaction._id,
          status: transaction.status,
          paymentStatus: transaction.paymentStatus
        }
      });
    }

    throw new Error('Payment verification failed');
  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment verification failed',
      details: error.message
    });
  }
});

// Get user's transactions
router.get('/my-transactions', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { userId: req.user.userId };
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.findUserTransactions(req.user.userId)      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      items: transactions,
      meta: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:transactionId/credentials', authenticateToken, async (req, res) => {
  try {
    let transaction = await Transaction.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(req.params.transactionId) ? req.params.transactionId : null },
        { transactionId: req.params.transactionId },
        { tx_ref: req.params.transactionId }
      ]
    })
    .populate({
      path: 'productId',
      select: 'type username followers age accountCredentials security images'
    })
    .lean();

    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        error: 'Transaction not found' 
      });
    }

    // Check authorization using either userId or customerId
    const userAuthorized = 
      (transaction.userId?.toString() === req.user._id?.toString()) ||
      (transaction.customerId?.toString() === req.user._id?.toString()) ||
      (transaction.meta?.userId === req.user._id?.toString()) ||
      req.user.role === 'admin';

    if (!userAuthorized) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized access to credentials',
        debug: {
          transactionUserId: transaction.userId,
          requestUserId: req.user._id,
          customerId: transaction.customerId,
          metaUserId: transaction.meta?.userId
        }
      });
    }

    // Verify transaction status
    if (transaction.status !== 'completed') {
      return res.status(400).json({ 
        success: false, 
        error: 'Transaction not yet completed' 
      });
    }

    if (!transaction.productId) {
      return res.status(404).json({
        success: false,
        error: 'Product not found for this transaction'
      });
    }

    // Format credentials response
    const credentials = {
      transactionId: transaction.transactionId || transaction._id,
      platform: transaction.productId.type,
      username: transaction.productId.username,
      followers: transaction.productId.followers,
      age: transaction.productId.age,
      accountEmail: transaction.productId.accountCredentials?.accountEmail || '',
      accountPassword: transaction.productId.accountCredentials?.accountPassword || '',
      accountPhoneNumber: transaction.productId.accountCredentials?.accountPhoneNumber || '',
      additionalInfo: transaction.productId.accountCredentials?.additionalInfo || '',
      security: transaction.productId.security || {},
      images: transaction.productId.images || [],
      purchaseDate: transaction.createdAt
    };

    res.json({
      success: true,
      data: credentials
    });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch credentials',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;