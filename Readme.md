# ScottTech Account Sales Backend API 🚀

A robust Node.js/Express backend service for managing social media account sales with comprehensive features including user management, secure payments, escrow service, and detailed analytics.

![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)
![Express](https://img.shields.io/badge/Express-v4.21-blue.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-v6.12-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## 🌟 Core Features

### Authentication & Security
- JWT-based authentication system
- Google OAuth integration
- Two-factor authentication
- Rate limiting and CORS protection
- Helmet security headers
- Password hashing and validation

### Product Management
- Social media account listings
- Multi-platform support (Instagram, Facebook, Twitter, WhatsApp)
- Image upload with Supabase storage
- Account credentials management
- Availability tracking

### Payment Processing
- Flutterwave integration
- Multiple payment methods (Card, Bank Transfer, USSD)
- Escrow system for secure transactions
- Transaction history and tracking
- Payment verification system

### User Dashboard
- Real-time analytics
- Transaction monitoring
- Security settings
- Notification center
- Profile management

### Admin Features
- Sales reporting and analytics
- Customer management
- Product moderation
- Help ticket system
- User segment management

## 🛠️ Technical Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT, Passport.js
- **Storage**: Supabase
- **Payment**: Flutterwave
- **Email Service**: Mailjet
- **Security**: 
  - Helmet
  - Express Rate Limit
  - CORS
  - Input validation
  - XSS protection

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB
- Supabase account
- Flutterwave account
- Mailjet account
- Google OAuth credentials (for social login)

## 🚀 Getting Started

1. **Clone the repository**
```bash
git clone https://github.com/freshpex/accountSalesBackend.git
cd accountSalesBackend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env` file with the following variables:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
MJ_APIKEY=your_mailjet_api_key
MJ_SECRETKEY=your_mailjet_secret
FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret
FRONTEND_URL=http://localhost:5173
```

4. **Start the server**
```bash
# Development
npm run start-dev

# Production
npm start
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/v1/user/signup` - Register new user
- `POST /api/v1/user/signin` - User login
- `POST /api/v1/user/forgot-password` - Password reset request
- `GET /api/v1/user/auth/google` - Google OAuth login

### Product Endpoints
- `GET /api/v1/products` - List all products
- `POST /api/v1/products` - Create new product
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product

### Transaction Endpoints
- `POST /api/v1/transactions/initiate` - Start transaction
- `GET /api/v1/transactions` - List transactions
- `GET /api/v1/transactions/:id/credentials` - Get account credentials

### Dashboard Endpoints
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

- User
- Product
- Transaction
- UserProfile
- Notification
- HelpTicket
- SalesReport
- Escrow

## ⚙️ Configuration

### Rate Limiting
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
```

## 🔄 Workflows

### Purchase Flow
1. User initiates purchase
2. Payment processing
3. Escrow creation
4. Credential transfer
5. Transaction completion

## 🧪 Testing

```bash
npm test
```

## 📈 Future Improvements

- [ ] WebSocket integration for real-time updates
- [ ] Enhanced analytics dashboard
- [ ] Additional payment gateways
- [ ] Automated testing suite
- [ ] Docker containerization
- [ ] Blockchain integration for escrow
- [ ] AI-powered fraud detection
- [ ] Multi-language support

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@scotttech.com or create an issue in the repository.

## 🙏 Acknowledgments

- Express.js team
- MongoDB team
- Flutterwave
- Supabase
- Mailjet