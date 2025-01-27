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
      .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
      .header { background: #2C3E50; padding: 20px; text-align: center; }
      .header img { max-width: 150px; }
      .content { padding: 30px; background: #ffffff; }
      .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; }
      .button { background: #3498DB; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0; }
      .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
      .social-links { margin: 20px 0; }
      .social-links a { margin: 0 10px; color: #2C3E50; text-decoration: none; }
    </style>
  `;

  const footer = `
    <div class="footer">
      <div class="social-links">
        <a href="https://www.facebook.com/">Facebook</a> | <a href="https://www.x.com/login">Twitter</a> | <a href="https://www.instagram.com/login">Instagram</a>
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
            <h1 style="color: #2C3E50;">Welcome to ScottTech!</h1>
            <p>Dear ${context.name},</p>
            <p>We're thrilled to welcome you to the ScottTech family! Your account has been successfully created, and you're now part of our growing community of digital entrepreneurs.</p>
            <p>Here's what you can do next:</p>
            <ul>
              <li>Complete your profile</li>
              <li>Browse our marketplace</li>
              <li>Set up your security preferences</li>
            </ul>
            <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Visit Your Dashboard</a>
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
