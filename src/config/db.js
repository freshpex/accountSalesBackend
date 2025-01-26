const mongoose = require('mongoose');

const connectDB = async () => {
  const connectWithRetry = async () => {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        dbName: 'accountSales',
        autoIndex: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4
      });

      console.log(`MongoDB Connected: ${conn.connection.host}`);
      
      // Log available collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('Available collections:', collections.map(c => c.name));
      
    } catch (error) {
      console.error(`MongoDB connection error: ${error.message}`);
      setTimeout(connectWithRetry, 5000);
    }
  };

  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Attempting to reconnect...');
    connectWithRetry();
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
    mongoose.disconnect();
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    process.exit(0);
  });

  connectWithRetry();
};

module.exports = connectDB;
