const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, authorizeAdmin } = require('../../middleware/auth');
const Product = require('../../models/Product');
const { upload, uploadToSupabase } = require('../../middleware/upload');

router.get('/available', authenticateToken, async (req, res) => {
  try {
    const availableProducts = await Product.find({ 
      status: { $nin: ['sold', 'deleted'] }
    })
    .select('_id name price images')
    .sort('-createdAt')
    .limit(100);

    res.json({
      success: true,
      data: availableProducts
    });
  } catch (error) {
    console.error('Error fetching available products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available products'
    });
  }
});

// Get products with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      platform, 
      status, 
      sort = '-createdAt',
      page = 1,
      limit = 10
    } = req.query;

    const query = {};
    
    if (platform && platform !== 'all') {
      query.type = platform.toLowerCase();
    }

    if (status) {
      query.status = status;
    }

    // Get products count by type
    const stats = await Product.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const statsObject = {
      instagram: 0,
      facebook: 0,
      twitter: 0,
      whatsapp: 0,
      total: 0
    };

    stats.forEach(stat => {
      if (stat._id) {
        statsObject[stat._id.toLowerCase()] = stat.count;
        statsObject.total += stat.count;
      }
    });

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / parseInt(limit));

    const products = await Product.find(query)
      .sort(sort)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: {
        items: products.map(product => ({
          id: product._id,
          ...product,
          type: product.type?.toLowerCase()
        })),
        meta: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalProducts,
          itemsPerPage: parseInt(limit)
        },
        stats: statsObject
      }
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch products'
    });
  }
});

// Get single product
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID format'
      });
    }

    const product = await Product.findOne({
      _id: id,
      status: { $ne: 'deleted' }
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product',
      details: error.message
    });
  }
});

// Create product with file upload
router.post('/', authenticateToken, upload.array('images', 4), uploadToSupabase, async (req, res) => {
  try {
    if (!req.body.type) {
      return res.status(400).json({
        success: false,
        message: 'Product type is required'
      });
    }

    const productData = {
      type: req.body.type.toLowerCase(),
      status: req.body.status || 'available',
      
      ...(req.body.username && { username: req.body.username }),
      ...(req.body.age && { age: Number(req.body.age) }),
      ...(req.body.followers && { followers: Number(req.body.followers) }),
      ...(req.body.price && { price: Number(req.body.price) }),
      ...(req.body.region && { region: req.body.region }),
      ...(req.body.about && { about: req.body.about }),
      ...(req.body.engagement && { engagement: Number(req.body.engagement) }),
      ...(req.fileUrls?.length && { images: req.fileUrls }),
      accountCredentials: {
        ...(req.body.accountEmail && { accountEmail: req.body.accountEmail }),
        ...(req.body.accountPassword && { accountPassword: req.body.accountPassword }),
        ...(req.body.accountPhoneNumber && { accountPhoneNumber: req.body.accountPhoneNumber }),
        ...(req.body.additionalInfo && { additionalInfo: req.body.additionalInfo })
      },
      security: {
        twoFactorEnabled: req.body.twoFactorEnabled === 'true',
        originalEmailAvailable: req.body.originalEmailAvailable === 'true'
      }
    };

    console.log('Creating product with data:', {
      ...productData,
      accountCredentials: {
        ...productData.accountCredentials,
        accountPassword: productData.accountCredentials.accountPassword ? '[REDACTED]' : ''
      }
    });

    const product = new Product(productData);
    await product.save();
    
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Product creation error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message
    });
  }
});

// Update product
router.put('/:id', authenticateToken, upload.array('images', 4), uploadToSupabase, async (req, res) => {
  try {

    const updateData = {
      ...(req.body.type && { type: req.body.type.toLowerCase() }),
      ...(req.body.username && { username: req.body.username }),
      ...(req.body.status && { status: req.body.status }),
      
      // Convert numeric fields only if they exist and are valid
      ...(req.body.age && !isNaN(Number(req.body.age)) && { age: Number(req.body.age) }),
      ...(req.body.followers && !isNaN(Number(req.body.followers)) && { followers: Number(req.body.followers) }),
      ...(req.body.price && !isNaN(Number(req.body.price)) && { price: Number(req.body.price) }),
      ...(req.body.engagement && !isNaN(Number(req.body.engagement)) && { engagement: Number(req.body.engagement) }),
      
      ...(req.body.region && { region: req.body.region }),
      ...(req.body.about && { about: req.body.about }),

      ...((req.body.averageLikes || req.body.averageComments) && {
        stats: {
          ...(req.body.averageLikes && !isNaN(Number(req.body.averageLikes)) && { 
            averageLikes: Number(req.body.averageLikes) 
          }),
          ...(req.body.averageComments && !isNaN(Number(req.body.averageComments)) && { 
            averageComments: Number(req.body.averageComments) 
          })
        }
      }),

      // Security settings
      security: {
        twoFactorEnabled: req.body.twoFactorEnabled === 'true',
        originalEmailAvailable: req.body.originalEmailAvailable === 'true'
      },

      ...((req.body.accountEmail || req.body.accountPassword || 
          req.body.accountPhoneNumber || req.body.additionalInfo) && {
        accountCredentials: {
          ...(req.body.accountEmail && { accountEmail: req.body.accountEmail }),
          ...(req.body.accountPassword && { accountPassword: req.body.accountPassword }),
          ...(req.body.accountPhoneNumber && { accountPhoneNumber: req.body.accountPhoneNumber }),
          ...(req.body.additionalInfo && { additionalInfo: req.body.additionalInfo })
        }
      })
    };

    // Add images if they exist
    if (req.fileUrls?.length) {
      updateData.images = req.fileUrls;
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { 
        new: true,
        runValidators: true
      }
    );

    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: 'Product not found' 
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Delete product
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
