const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Transaction = require('../models/Transaction');

// Initialize payment
router.post('/initialize', authenticateToken, async (req, res) => {
  try {
    const { amount, email, productId, customerId } = req.body;

    const transaction = new Transaction({
      amount,
      email,
      productId,
      customerId,
      status: 'pending',
    });

    await transaction.save();

    res.json({ success: true, transaction });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify payment
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { transactionId, status } = req.body;

    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    transaction.status = status;
    await transaction.save();

    res.json({ success: true, transaction });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payment callback verification
router.post('/callback', async (req, res) => {
  try {
    const { transaction_id, tx_ref, status, meta } = req.body;
    console.log('Payment callback received:', { transaction_id, tx_ref, status, meta });

    if (!transaction_id || !tx_ref) {
      return res.status(400).json({
        success: false,
        error: 'Missing transaction_id or tx_ref'
      });
    }

    let defaultValues = {
      paymentMethod: 'flutterwave',
      amount: meta.amount || 0,
      userId: meta.userId || '000000000000000000000000', // Default placeholder
      customerId: meta.customerId || '000000000000000000000000', // Default placeholder
      productId: meta.productId || '000000000000000000000000', // Default placeholder
      status: status === 'completed' ? 'completed' : 'pending'
    };

    // Find existing transaction
    let transaction = await Transaction.findOne({
      $or: [
        { transactionId: transaction_id },
        { tx_ref: tx_ref }
      ]
    });

    if (!transaction) {
      // Create new transaction
      transaction = new Transaction({
        transactionId: transaction_id,
        tx_ref: tx_ref,
        ...defaultValues,
        meta: meta || {}
      });
    } else {
      // Update existing transaction
      transaction.status = defaultValues.status;
      transaction.meta = { ...transaction.meta, ...meta };
      transaction.lastVerified = new Date();
    }

    await transaction.save();
    console.log('Transaction saved:', transaction);

    res.json({
      success: true,
      transaction: {
        id: transaction._id,
        transactionId: transaction.transactionId,
        status: transaction.status,
        tx_ref: transaction.tx_ref
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify payment'
    });
  }
});

module.exports = router;
