const mailjet = require('node-mailjet').apiConnect(
  process.env.MJ_APIKEY,
  process.env.MJ_SECRETKEY
);

const sendEmail = async ({ to, subject, template, context }) => {
  try {
    if (!to || !subject || !template || !context) {
      throw new Error('Missing required email parameters');
    }

    const defaultContext = {
      name: 'Valued Customer',
      time: new Date().toLocaleString(),
      ...context
    };

    const request = mailjet.post("send", { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: process.env.EMAIL_FROM,
            Name: process.env.EMAIL_FROM_NAME
          },
          To: [
            {
              Email: to,
              Name: context.name || to
            }
          ],
          Subject: subject,
          HTMLPart: generateEmailTemplate(template, defaultContext)
        }
      ]
    });

    await request;
    return true;
  } catch (error) {
    console.error('Email error:', error);
    if (error.response?.data) {
      console.error('Mailjet error details:', error.response.data);
    }
    throw new Error('Email could not be sent: ' + error.message);
  }
};

const generateEmailTemplate = (template, context) => {
  const baseStyle = `
    <style>
      @media only screen and (max-width: 600px) {
        .container { width: 100% !important; }
        .content { padding: 20px !important; }
        .button { display: block !important; text-align: center !important; }
      }
      .container { max-width: 600px; margin: 0 auto; font-family: 'Arial', sans-serif; }
      .header { background: linear-gradient(135deg, #2C3E50 0%, #3498DB 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .header img { max-width: 200px; height: auto; }
      .content { padding: 40px; background: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .footer { background: #f8f9fa; padding: 30px; text-align: center; font-size: 14px; border-radius: 0 0 10px 10px; }
      .button { 
        background: linear-gradient(135deg, #3498DB 0%, #2980B9 100%);
        color: white;
        padding: 15px 30px;
        text-decoration: none;
        border-radius: 25px;
        display: inline-block;
        margin: 20px 0;
        font-weight: bold;
        transition: all 0.3s ease;
      }
      .button:hover { 
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
      }
      .details {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 10px;
        margin: 20px 0;
        border-left: 5px solid #3498DB;
      }
      .social-links {
        margin: 25px 0;
        padding: 20px 0;
        border-top: 1px solid #eee;
        border-bottom: 1px solid #eee;
      }
      .social-links a {
        margin: 0 15px;
        color: #2C3E50;
        text-decoration: none;
        font-weight: bold;
      }
      .social-links img {
        width: 24px;
        height: 24px;
        vertical-align: middle;
        margin-right: 5px;
      }
      .highlight {
        color: #3498DB;
        font-weight: bold;
      }
    </style>
  `;

  const footer = `
    <div class="footer">
      <div class="social-links">
        <a href="https://www.facebook.com/"><img src="https://scottech.vercel.app/facebook-icon.png" alt="Facebook">Facebook</a> | <a href="https://www.x.com/login"><img src="https://scottech.vercel.app/twitter-icon.png" alt="Twitter">Twitter</a> | <a href="https://www.instagram.com/login"><img src="https://scottech.vercel.app/instagram-icon.png" alt="Instagram">Instagram</a>
      </div>
      <p>© ${new Date().getFullYear()} ScottTech. All rights reserved.</p>
      <p>8732 Tech Street, Silicon Valley, CA 94025</p>
    </div>
  `;

  switch (template) {
    case 'welcome':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <img src="https://scottech.vercel.app/logo.svg" alt="ScottTech Logo">
          </div>
          <div class="content">
            <h1 style="color: #2C3E50; font-size: 28px; margin-bottom: 30px;">Welcome to the Future of Tech!, Scotts Technology.</h1>
            <p>Dear ${context.name},</p>
            <p>🎉 Welcome to the ScottTech family! We're excited to have you join our community of innovators and digital entrepreneurs.</p>
            
            <div class="details">
              <h3>🚀 Getting Started</h3>
              <ul style="list-style-type: none; padding: 0;">
                <li>✅ Complete your profile</li>
                <li>🏪 Explore our marketplace</li>
                <li>🔒 Set up two-factor authentication</li>
                <li>💡 Check out our featured products</li>
              </ul>
            </div>

            <a href="${process.env.FRONTEND_URL}/dashboard" class="button">
              Access Your Dashboard →
            </a>
            
            <p style="font-size: 14px; color: #666;">Need help getting started? Our support team is available 24/7!</p>
          </div>
          ${footer}
        </div>
      `;

    case 'resetPassword':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <img src="https://scottech.vercel.app/logo.svg" alt="ScottTech Logo">
          </div>
          <div class="content">
            <h1 style="color: #2C3E50;">Password Reset Request</h1>
            <p>We received a request to reset your password.</p>
            <div class="details">
              <p>Click the button below to create a new password:</p>
              <a href="${context.resetURL}" class="button">Reset Password</a>
              <p style="color: #e74c3c;">This link will expire in 30 minutes.</p>
            </div>
            <p>If you didn't request this password reset, please ignore this email or contact our support team if you have concerns.</p>
          </div>
          ${footer}
        </div>
      `;

    case 'signinAlert':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <img src="${process.env.FRONTEND_URL}/logo.svg" alt="ScottTech Logo">
          </div>
          <div class="content">
            <h1 style="color: #2C3E50;">New Sign-In Activity</h1>
            <p>Hello ${context.name},</p>
            <div class="details">
              <h3>Login Details:</h3>
              <p>Time: ${context.time}</p>
              <p>Location: ${context.location || 'Unknown'}</p>
              <p>Device: ${context.device || 'Unknown'}</p>
            </div>
            <p style="color: #e74c3c;">If this wasn't you, please take immediate action:</p>
            <a href="${process.env.FRONTEND_URL}/settings" class="button">Review Security Settings</a>
          </div>
          ${footer}
        </div>
      `;

    case 'escrowRequest':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <img src="https://scottech.vercel.app/logo.svg" alt="ScottTech Logo">
          </div>
          <div class="content">
            <h1 style="color: #2C3E50;">New Escrow Request</h1>
            <p>Hello ${context.name},</p>
            <div class="details">
              <h3>Transaction Details:</h3>
              <p><strong>Buyer:</strong> ${context.buyerName}</p>
              <p><strong>Product:</strong> ${context.productName}</p>
              <p><strong>Amount:</strong> $${context.amount}</p>
              <p><strong>Escrow ID:</strong> ${context.escrowId}</p>
            </div>
            <a href="${process.env.FRONTEND_URL}/escrow/${context.escrowId}" class="button">Review Request</a>
            <p>Please review and respond to this request within 24 hours.</p>
          </div>
          ${footer}
        </div>
      `;

    case 'paymentSuccess':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <img src="https://scottech.vercel.app/logo.svg" alt="ScottTech Logo">
          </div>
          <div class="content">
            <h1 style="color: #2C3E50;">Payment Confirmation</h1>
            <p>Hello ${context.name},</p>
            <div class="details">
              <h3>Payment Details:</h3>
              <p><strong>Product:</strong> ${context.productName}</p>
              <p><strong>Amount:</strong> $${context.amount}</p>
              <p><strong>Transaction ID:</strong> ${context.transactionId}</p>
              <p><strong>Date:</strong> ${context.date}</p>
              <p><strong>Payment Method:</strong> ${context.paymentMethod || 'Credit Card'}</p>
            </div>
            <a href="${process.env.FRONTEND_URL}/purchased-account/${context.transactionId}" class="button">View Transaction</a>
          </div>
          ${footer}
        </div>
      `;

    case 'transactionComplete':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <img src="${process.env.FRONTEND_URL}/logo.svg" alt="ScottTech Logo">
          </div>
          <div class="content">
            <h1 style="color: #2C3E50;">Transaction Complete</h1>
            <p>Hello ${context.name},</p>
            <div class="details">
              <h3>Transaction Summary:</h3>
              <p><strong>Product:</strong> ${context.productName}</p>
              <p><strong>Amount:</strong> ${context.amount} Naira</p>
              <p><strong>Transaction ID:</strong> ${context.transactionId}</p>
              <p><strong>Status:</strong> Completed</p>
            </div>
            <p>Your purchase is now ready for access!</p>
            <a href="${process.env.FRONTEND_URL}/purchased-account/${context.transactionId}" class="button">Access Purchase</a>
            <p>Need help? Our support team is available 24/7.</p>
          </div>
          ${footer}
        </div>
      `;

    default:
      return '';
  }
};

module.exports = sendEmail;
