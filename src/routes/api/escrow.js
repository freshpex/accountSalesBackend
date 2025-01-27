const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const Escrow = require('../../models/Escrow');
const Product = require('../../models/Product');

// Get escrow details by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching escrow with ID:', req.params.id);
    
    const escrow = await Escrow.findById(req.params.id)
      .populate({
        path: 'productId',
        select: 'username type price images'
      })
      .populate('buyerId', 'email firstName lastName');

    if (!escrow) {
      return res.status(404).json({ 
        success: false,
        error: 'Escrow not found' 
      });
    }

    // Check if user is authorized to view this escrow
    if (escrow.buyerId._id.toString() !== req.user.userId) {
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized to view this escrow' 
      });
    }

    // Format the response
    const response = {
      success: true,
      escrow: {
        _id: escrow._id,
        status: escrow.status,
        amount: escrow.amount,
        createdAt: escrow.createdAt,
        product: escrow.productId,
        buyer: escrow.buyerId,
        metadata: escrow.metadata
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Escrow fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch escrow details',
      details: error.message
    });
  }
});

// Update escrow status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const escrow = await Escrow.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('productId');

    if (!escrow) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    res.json(escrow);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update escrow status',
      details: error.message
    });
  }
});

module.exports = router;
