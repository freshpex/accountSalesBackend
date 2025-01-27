# ScottTech Account Sales Backend API 🚀

A robust Node.js/Express backend service for managing social media account sales with comprehensive features including user management, secure payments, escrow service, and detailed analytics.

![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)
![Express](https://img.shields.io/badge/Express-v4.21-blue.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-v6.12-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## 🌐 Frontend Application
The frontend application is deployed and accessible at: [https://scottech.vercel.app](https://scottech.vercel.app)

- The repository is accessible at: [https://github.com/freshpex/accountSalesFrontend](https://github.com/freshpex/accountSalesFrontend)


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

### Authentication & User Management

## 🔥 Complete API Documentation

### Core API Groups
1. **User Management**
   - Authentication & Authorization
   - Profile Management
   - Security Settings
   - Role-based Access Control

2. **Product System**
   - Social Media Accounts
   - Multi-platform Support
   - Image Management
   - Inventory Control

3. **Transaction System**
   - Payment Processing
   - Escrow Service
   - Purchase Verification
   - Credential Transfer

4. **Analytics & Reporting**
   - Sales Analytics
   - Customer Insights
   - Regional Performance
   - Revenue Tracking

### Detailed Endpoints

#### Authentication System

## 🔥 API Endpoints

### Authentication Endpoints
- `POST /api/v1/user/signup` - Register new user
- `POST /api/v1/user/signin` - User login
- `POST /api/v1/user/forgot-password` - Password reset request
- `GET /api/v1/user/auth/google` - Google OAuth login

### Product Endpoints
- `GET     /api/v1/products`                - List all products
- `POST    /api/v1/products`                - Create product
- `GET     /api/v1/products/:id`            - Get product details
- `PUT     /api/v1/products/:id`            - Update product
- `DELETE  /api/v1/products/:id`            - Delete product
- `GET     /api/v1/products/available`      - List available products
- `GET     /api/v1/products/stats`          - Get product statistics

### Transaction Endpoints
#### Transaction Routes
- `POST    /api/v1/transactions/initiate`         - Start transaction
- `GET     /api/v1/transactions `                 - List transactions
- `GET     /api/v1/transactions/:id`              - Transaction details
- `PUT     /api/v1/transactions/:id`              - Update transaction
- `DELETE  /api/v1/transactions/:id`              - Delete transaction
- `GET     /api/v1/transactions/:id/credentials`  - Get purchased credentials
#### Payment Processing
- `POST    /api/v1/transactions/callback`       - Payment callback
- `GET     /api/v1/transactions/verify/:id`     - Verify payment
- `POST    /api/v1/transactions/webhook`        - Payment webhook

### Dashboard Endpoints
#### Admin Dashboard
- `GET     /api/v1/dashboard/overview`      - Get dashboard overview
- `GET     /api/v1/dashboard/metrics`       - Get performance metrics
- `GET     /api/v1/dashboard/regional`      - Get regional analytics
- `GET     /api/v1/dashboard/popular`       - Get popular products
#### User Dashboard
- `GET     /api/v1/user/dashboard/overview`     - Personal dashboard
- `GET     /api/v1/user/dashboard/spending`     - Spending analytics
- `GET     /api/v1/user/dashboard/activity`     - Recent activities
- `GET     /api/v1/user/dashboard/purchases`    - Purchase history

### Customer Management
- `GET     /api/v1/customers`              - List customers
- `POST    /api/v1/customers`              - Add customer
- `GET     /api/v1/customers/:id`          - Customer details
- `PUT     /api/v1/customers/:id`          - Update customer
- `DELETE  /api/v1/customers/:id`          - Delete customer
- `PATCH   /api/v1/customers/:id/segment`  - Update segment
- `GET     /api/v1/customers/:id/activity` - Customer activity

### Help & Support System
- `GET     /api/v1/help-tickets`                - List tickets
- `POST    /api/v1/help-tickets`                - Create ticket
- `GET     /api/v1/help-tickets/:id`            - Ticket details
- `PUT     /api/v1/help-tickets/:id`            - Update ticket
- `POST    /api/v1/help-tickets/:id/responses`  - Add response
- `PATCH   /api/v1/help-tickets/:id/status`     - Update status

### Notification System
- `GET     /api/v1/notifications`             - Get notifications
- `PATCH   /api/v1/notifications/:id/read`    - Mark as read
- `GET     /api/v1/notifications/settings`    - Get settings
- `PUT     /api/v1/notifications/settings`    - Update settings

### Reports & Analytics
- `GET     /api/v1/sales/report`          - Get sales report
- `GET     /api/v1/sales/analytics`       - Get analytics
- `GET     /api/v1/sales/regional`        - Regional data
- `GET     /api/v1/sales/performance`     - Performance metrics

### Escrow System
- `POST    /api/v1/escrow`                 - Create escrow
- `GET     /api/v1/escrow/:id`             - Get escrow details
- `PATCH   /api/v1/escrow/:id/status`      - Update status
- `GET     /api/v1/escrow/:id/credentials` - Get credentials

## Product Features
- Multi-image upload (up to 4 images)
- Account credentials management
- Social media metrics tracking
- Region-based categorization
- Sales performance tracking

## 🔒 Security Features

- JWT-based authentication
- Rate limiting
- CORS protection
- Helmet security headers
- Password hashing
- Input validation
- XSS protection
- OAuth 2.0 integration
- Password hashing with bcrypt
- Two-factor authentication
- Session management

## API Security

- Rate limiting per endpoint
- CORS configuration
- Request validation
- Input sanitization
- XSS protection
- SQL injection prevention

## Data Protection
- Encrypted credentials storage
- Secure file uploads
- Access control
- Role-based permissions

## 🤖 Automated Processes

### Background Jobs
- Sales report generation
- Customer segmentation updates
- Analytics calculation
- Email notifications
- Activity logging

### Webhooks
- Payment notifications
- Transaction updates
- System alerts
- Integration events


## 📊 Database Models

- User
  - Authentication details
  - Profile information
  - Security settings
  - Notification preferences

- Product
  - Account details
  - Media content
  - Sales metrics
  - Security features

- Transaction
  - Payment details
  - Product information
  - Customer data
  - Status tracking

- Customer
  - Profile details
  - Purchase history
  - Segment information
  - Activity tracking
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

For support, email epekipoluenoch@gmail.com or create an issue in the repository.

## 🙏 Acknowledgments

- Express.js team
- MongoDB team
- Flutterwave
- Supabase
- Mailjet