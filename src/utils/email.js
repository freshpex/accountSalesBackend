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
        <a href="https://www.facebook.com/"> <svg
    width="36"
    height="36"
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g id="facebook" clipPath="url(#clip0_0_413)">
      <g id="Group">
        <path
          id="Vector"
          d="M18 36C27.9411 36 36 27.9411 36 18C36 8.05888 27.9411 0 18 0C8.05888 0 0 8.05888 0 18C0 27.9411 8.05888 36 18 36Z"
          fill="#3B5998"
        />
        <path
          id="Vector_2"
          d="M22.5252 18.7045H19.3133V30.4713H14.447V18.7045H12.1326V14.5692H14.447V11.8931C14.447 9.97949 15.3561 6.98291 19.3566 6.98291L22.9613 6.99799V11.012H20.3459C19.9169 11.012 19.3136 11.2264 19.3136 12.1392V14.573H22.9503L22.5252 18.7045Z"
          fill="white"
        />
      </g>
    </g>
    <defs>
      <clipPath id="clip0_0_413">
        <rect width="36" height="36" fill="white" />
      </clipPath>
    </defs>
  </svg> </a> | <a href="https://www.x.com/login"> <svg
    width="36"
    height="36"
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g id="twitter" clipPath="url(#clip0_0_417)">
      <g id="Group">
        <path
          id="Vector"
          d="M18.0002 35.9997C27.9412 35.9997 36 27.9409 36 17.9998C36 8.0588 27.9412 0 18.0002 0C8.05917 0 0.000366211 8.0588 0.000366211 17.9998C0.000366211 27.9409 8.05917 35.9997 18.0002 35.9997Z"
          fill="#55ACEE"
        />
        <g id="Group_2">
          <path
            id="Vector_2"
            d="M29.0257 12.9361C28.2543 13.2781 27.4246 13.5094 26.5544 13.6128C27.4428 13.0804 28.1247 12.2382 28.4465 11.2329C27.6151 11.7261 26.6939 12.0838 25.7143 12.2767C24.9295 11.4408 23.8113 10.9185 22.5731 10.9185C20.1974 10.9185 18.2706 12.8452 18.2706 15.2209C18.2706 15.5582 18.3088 15.8864 18.3826 16.2015C14.8069 16.0221 11.6364 14.3093 9.51424 11.7055C9.14396 12.3408 8.93155 13.0804 8.93155 13.8688C8.93155 15.3611 9.69167 16.6786 10.8455 17.45C10.1406 17.4278 9.4767 17.2343 8.89689 16.9112C8.89657 16.9295 8.89657 16.9478 8.89657 16.9658C8.89657 19.0504 10.3803 20.7892 12.3481 21.1842C11.9875 21.283 11.6066 21.3353 11.2148 21.3353C10.9369 21.3353 10.6677 21.3087 10.4053 21.2586C10.9527 22.9675 12.5413 24.2115 14.4244 24.2465C12.9517 25.4007 11.0967 26.0883 9.08043 26.0883C8.7339 26.0883 8.39057 26.0681 8.05463 26.0279C9.95767 27.2492 12.2198 27.9612 14.6493 27.9612C22.5631 27.9612 26.891 21.4053 26.891 15.7192C26.891 15.5328 26.8868 15.347 26.8784 15.1628C27.7198 14.5564 28.4491 13.7989 29.0257 12.9361Z"
            fill="#F1F2F2"
          />
        </g>
      </g>
    </g>
    <defs>
      <clipPath id="clip0_0_417">
        <rect width="36" height="36" fill="white" />
      </clipPath>
    </defs>
  </svg> </a> | <a href="https://www.linkedin.com/login"> <svg
    width="36"
    height="36"
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g id="linkedin" clipPath="url(#clip0_0_422)">
      <g id="Group">
        <path
          id="Vector"
          d="M18 35.9998C27.9411 35.9998 36 27.9409 36 17.9998C36 8.05863 27.9411 -0.000244141 18 -0.000244141C8.05884 -0.000244141 -3.05176e-05 8.05863 -3.05176e-05 17.9998C-3.05176e-05 27.9409 8.05884 35.9998 18 35.9998Z"
          fill="#007AB9"
        />
        <g id="Group_2">
          <path
            id="Vector_2"
            d="M28.7548 19.4481V26.8691H24.4523V19.9455C24.4523 18.207 23.8311 17.0198 22.2733 17.0198C21.0845 17.0198 20.3783 17.8191 20.0664 18.593C19.9531 18.8696 19.9239 19.2537 19.9239 19.6416V26.8688H15.6211C15.6211 26.8688 15.6788 15.1424 15.6211 13.9286H19.9242V15.7623C19.9156 15.7768 19.9034 15.7909 19.8957 15.8047H19.9242V15.7623C20.496 14.8825 21.5157 13.6247 23.8019 13.6247C26.6326 13.6247 28.7548 15.4742 28.7548 19.4481ZM11.12 7.69092C9.64813 7.69092 8.68521 8.65705 8.68521 9.9264C8.68521 11.1688 9.62022 12.1628 11.0635 12.1628H11.0914C12.5921 12.1628 13.5252 11.1688 13.5252 9.9264C13.4966 8.65705 12.5921 7.69092 11.12 7.69092ZM8.94094 26.8691H13.2422V13.9286H8.94094V26.8691Z"
            fill="#F1F2F2"
          />
        </g>
      </g>
    </g>
    <defs>
      <clipPath id="clip0_0_422">
        <rect width="36" height="36" fill="white" />
      </clipPath>
    </defs>
  </svg></a>
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
