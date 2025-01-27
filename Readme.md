# Account Sales Backend API 🚀

A robust Node.js/Express backend service for managing social media account sales with secure payment processing, user authentication, and comprehensive dashboard analytics.

![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)
![Express](https://img.shields.io/badge/Express-v4.21-blue.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-v6.12-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## 🌟 Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Google OAuth integration
  - Role-based access control
  - Two-factor authentication support

- **Product Management**
  - Social media account listings
  - Multi-image upload support
  - Account credentials management
  - Product status tracking

- **Payment Processing**
  - Flutterwave integration
  - Escrow system
  - Transaction history
  - Multiple payment methods

- **User Dashboard**
  - Real-time analytics
  - Transaction monitoring
  - Security settings
  - Notification center

- **Admin Features**
  - Sales reporting
  - Customer management
  - Product moderation
  - Help ticket system

## 🛠️ Tech Stack

- **Backend Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT, Passport.js
- **File Storage**: Supabase
- **Payment Gateway**: Flutterwave
- **Email Service**: Mailjet
- **Security**: Helmet, Express Rate Limit
- **Logging**: Morgan

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB
- Supabase account
- Flutterwave account
- Mailjet account

## 🚀 Getting Started

1. **Clone the repository**
```bash
git clone <repository-url>
cd accountSalesBackend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env` file in the root directory with the following variables:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
MJ_APIKEY=your_mailjet_api_key
MJ_SECRETKEY=your_mailjet_secret_key
FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret
FRONTEND_URL=http://localhost:5173
```

4. **Start the server**
```bash
npm run start
```

## 🌐 API Endpoints

### Authentication
- `POST /api/v1/user/signup` - Register new user
- `POST /api/v1/user/signin` - User login
- `POST /api/v1/user/forgot-password` - Password reset request
- `GET /api/v1/user/auth/google` - Google OAuth login

### Products
- `GET /api/v1/products` - List all products
- `POST /api/v1/products` - Create new product
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product

### Transactions
- `POST /api/v1/transactions/initiate` - Start transaction
- `GET /api/v1/transactions` - List transactions
- `GET /api/v1/transactions/:id/credentials` - Get account credentials

### Dashboard
- `GET /api/v1/user/dashboard/overview` - Dashboard overview
- `GET /api/v1/user/dashboard/metrics` - User metrics
- `GET /api/v1/user/dashboard/spending-chart` - Spending analytics

## 🔒 Security Features

- JWT-based authentication
- Rate limiting
- CORS protection
- Helmet security headers
- Password hashing
- Input validation
- XSS protection

## 📊 Database Models

### User Model
- Basic information
- Authentication details
- Security settings

### Product Model
- Account details
- Pricing information
- Status tracking
- Media storage

### Transaction Model
- Payment processing
- Status management
- Buyer/Seller info

### Additional Models
- Customer profiles
- Help tickets
- Notifications
- Sales reports

## ⚙️ Configuration

### Rate Limiting
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
```

### File Upload
```javascript
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});
```

## 🔄 Workflows

### Purchase Flow
1. User initiates purchase
2. Payment processing
3. Escrow creation
4. Credential transfer
5. Transaction completion

### Security Flow
1. User authentication
2. Token validation
3. Permission checking
4. Rate limit verification
5. Request processing

## 🧪 Testing

```bash
npm test
```

## 📝 Error Handling

The API implements comprehensive error handling:
- Validation errors
- Authentication errors
- Business logic errors
- Database errors
- Third-party service errors

## 🚨 Monitoring

- Request logging
- Error tracking
- Performance monitoring
- Security alerts

## 📈 Future Improvements

- [ ] WebSocket integration for real-time updates
- [ ] Enhanced analytics dashboard
- [ ] Additional payment gateways
- [ ] Automated testing suite
- [ ] Docker containerization

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support, email support@example.com or create an issue in the repository.