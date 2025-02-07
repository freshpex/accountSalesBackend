process.removeAllListeners('warning');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');
const apiRoutes = require('./routes/api');
const profileRoutes = require('./routes/api/profile');
const salesRoutes = require('./routes/api/sales');
const productRoutes = require('./routes/api/products');
const customerRoutes = require('./routes/api/customers');
const helpRoutes = require('./routes/api/help');
const transactionRoutes = require('./routes/api/transactions');
const notificationRoutes = require('./routes/api/notifications');
const dashboardRoutes = require('./routes/api/dashboard');
const productsRoutes = require('./routes/api/products');
const escrowRoutes = require('./routes/api/escrow');
const initializeDatabase = require('./init/setupDatabase');
const userDashboardRoutes = require('./routes/userDashboard');
const passport = require('./config/passport');

require('./jobs/updateSalesReport');
require('./models/Customer');
require('./models/Escrow');
require('./models/HelpTicket');
require('./models/Notification');
require('./models/Product');
require('./models/Profile');
require('./models/Sale');
require('./models/SalesReport');
require('./models/Transaction');
require('./models/User');
require('./models/UserProfile');


const app = express();
const PORT = process.env.PORT || 5000;

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || 
           req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress;
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 100,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

const productLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: 'Too many product requests, please try again after a minute'
});

// Security Middleware
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: function(origin, callback) {
    if(!origin) return callback(null, true);
    callback(null, origin);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(morgan('dev'));

// Apply rate limiters
app.use('/api/', limiter);
app.use('/api/v1/transactions', apiLimiter);
app.use('/api/v1/products', productLimiter);

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'Server is running',
    message: `Server started successfully on port ${PORT}`,
    serverUrl: `http://localhost:${PORT}`,
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/v1/user', authRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/user/profile', profileRoutes);
app.use('/api/v1/user/profile-picture', profileRoutes);
app.use('/api/v1/sales', salesRoutes);
app.use('/api/v1/sales-report', salesRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/help-tickets', helpRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1', apiRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/escrow', escrowRoutes);
app.use('/api/v1/user/dashboard', userDashboardRoutes);
app.use('/api/v1/user/profile', require('./routes/api/profile'));
app.use('/api/v1/user/security', require('./routes/api/security'));
app.use('/api/v1/user/notifications', require('./routes/api/notifications'));
app.use('/api/v1/user/dashboard', require('./routes/userDashboard'));
app.use('/api/v1/parcel', require('./routes/api/parcel'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err instanceof Error && err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const startServer = async () => {
  try {
    await connectDB();
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});
