const mailjet = require('node-mailjet').apiConnect(
  process.env.MJ_APIKEY,
  process.env.MJ_SECRETKEY
);
const QRCode = require('qrcode');

async function generateQRCodeSVG(text) {
  try {
    const qrSvg = await QRCode.toString(text, {
      type: 'svg',
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      width: 150,
      margin: 1
    });
    return qrSvg;
  } catch (err) {
    console.error('QR Code generation error:', err);
    return '';
  }
}

async function getCommonTemplate(data) {
  const qrCodeSvg = await generateQRCodeSVG(data.trackingId);
  
  return `
    <div class="tracking-box">
      ${qrCodeSvg}
    </div>
    <a href="${process.env.PFRONTEND_URL}/track/${data.trackingId}" 
       class="button">
      Track Your Shipment
    </a>
  `;
}

async function sendParcelEmails(emailData) {
  const { senderEmail, senderName, recipientEmail, recipientName, trackingId, fee } = emailData;

  const recipients = [
    {
      email: senderEmail,
      name: senderName,
      type: 'sender'
    },
    {
      email: recipientEmail,
      name: recipientName,
      type: 'recipient'
    },
    {
      email: 'pj944944@gmail.com',
      name: 'Admin',
      type: 'admin'
    }
  ];

  const emailRequests = await Promise.all(recipients.map(async recipient => {
    const template = await getEmailTemplate(recipient, { 
      trackingId, 
      senderName, 
      recipientName, 
      fee 
    });

    return mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [{
        From: {
          Email: "pj944944@gmail.com",
          Name: "Fedex Premium Parcel"
        },
        To: [{
          Email: recipient.email,
          Name: recipient.name
        }], 
        Subject: `Shipment Tracking ID: ${trackingId}`,
        TextPart: `Your tracking ID is ${trackingId}`,
        HTMLPart: template
      }]
    });
  }));

  await Promise.all(emailRequests);
}

async function getEmailTemplate(recipient, data) {
  const baseStyle = `
    <style>
      @media only screen and (max-width: 600px) {
        .container { width: 100% !important; }
        .tracking-box { padding: 15px !important; }
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        font-family: 'Arial', sans-serif;
        background: #ffffff;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 2px 15px rgba(0,0,0,0.1);
      }
      .header {
        background: linear-gradient(135deg, #00873D 0%, #006B30 100%);
        padding: 30px;
        text-align: center;
        color: white;
      }
      .header h1 {
        margin: 0;
        font-size: 32px;
        letter-spacing: 1px;
      }
      .content { padding: 30px; }
      .tracking-box {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
        border-left: 5px solid #00873D;
      }
      .tracking-number {
        font-size: 24px;
        color: #00873D;
        font-weight: bold;
        letter-spacing: 1px;
      }
      .status-badge {
        background: #00873D;
        color: white;
        padding: 5px 15px;
        border-radius: 15px;
        font-size: 14px;
        display: inline-block;
        margin: 10px 0;
      }
      .button {
        background: #00873D;
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
        background: #006B30;
        transform: translateY(-2px);
      }
      .footer {
        background: #f8f9fa;
        padding: 20px;
        text-align: center;
        font-size: 14px;
      }
    </style>
  `;

  const commonTemplate = await getCommonTemplate(data);
  
  const templates = {
    sender: `
      ${baseStyle}
      <div class="container">
        <div class="header">
          <h1>Fedex Premium Parcel</h1>
          <p style="margin: 10px 0 0;">Your Trusted Shipping Partner</p>
        </div>
        <div class="content">
          <h2 style="color: #00873D;">Hello ${recipient.name}!</h2>
          <p style="font-size: 20px; margin:10px;">Your shipment has been processed successfully. We will contact you soon for the collection of your package.</p>
          <p style="margin:10px;">Amount paid: $${data.fee}</p>
          <p style="margin:10px;">Your tracking ID is: <strong>${data.trackingId}</strong></p>
          <p style="margin:10px;">Package will be delivered to: ${data.recipientName}</p>
          ${commonTemplate}
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Fedex Premium Parcel. All rights reserved.</p>
          <p>Need help? Contact us at <a href="mailto:pj944944@gmail.com" 
           class="button">
          Email Support
        </a></p>
          <div class="social-links">
            <a href="#">Facebook</a> | <a href="#">Twitter</a> | <a href="#">Instagram</a>
          </div>
        </div>
      </div>
    `,
    recipient: `
      ${baseStyle}
      <div class="container">
        <div class="header">
          <h1>Fedex Premium Parcel</h1>
          <p style="margin: 10px 0 0;">Your Trusted Shipping Partner</p>
        </div>
        <div class="content">
          <h2 style="color: #00873D;">Hello ${recipient.name}!</h2>
          <p style="font-size: 20px; margin:10px;">A package is on its way to you from ${data.senderName}.</p>
          <p style="margin:10px;">You can track your package using this tracking ID: <strong>${data.trackingId}</strong></p>
          ${commonTemplate}
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Fedex Premium Parcel. All rights reserved.</p>
          <p>Need help? Contact us at <a href="mailto:pj944944@gmail.com" 
           class="button">
          Email Support
        </a></p>
          <div class="social-links">
            <a href="#">Facebook</a> | <a href="#">Twitter</a> | <a href="#">Instagram</a>
          </div>
        </div>
      </div>
    `,
    admin: `
      ${baseStyle}
      <div class="container">
        <div class="header">
          <h1>Fedex Premium Parcel</h1>
          <p style="margin: 10px 0 0;">Your Trusted Shipping Partner</p>
        </div>
        <div class="content">
          <h2 style="color: #00873D;">Hello ${recipient.name}!</h2>
          <p style="font-size: 20px; margin:10px;">New shipment created</p>
          <p style="margin:10px;">Tracking ID: ${data.trackingId}</p>
          <p style="margin:10px;">From: ${data.senderName}</p>
          <p style="margin:10px;">To: ${data.recipientName}</p>
          <p style="margin:10px;">Amount: $${data.fee}</p>
          ${commonTemplate}
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Fedex Premium Parcel. All rights reserved.</p>
          <p>Need help? Contact us at <a href="mailto:pj944944@gmail.com" 
           class="button">
          Email Support
        </a></p>
          <div class="social-links">
            <a href="#">Facebook</a> | <a href="#">Twitter</a> | <a href="#">Instagram</a>
          </div>
        </div>
      </div>
    `
  };

  return templates[recipient.type] || templates['sender'];
}

async function sendRequestEmails(emailData) {
  const { senderEmail, senderName, recipientEmail, recipientName, trackingId, fee, description } = emailData;

  const recipients = [
    {
      email: senderEmail,
      name: senderName,
      type: 'request-sender'
    },
    {
      email: recipientEmail,
      name: recipientName,
      type: 'request-recipient'
    },
    {
      email: 'pj944944@gmail.com',
      name: 'Admin',
      type: 'request-admin'
    }
  ];

  const emailRequests = await Promise.all(recipients.map(async recipient => {
    const template = await getRequestEmailTemplate(recipient, { 
      trackingId, 
      senderName, 
      recipientName,
      description, 
      fee 
    });

    return mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [{
        From: {
          Email: "pj944944@gmail.com",
          Name: "Fedex Premium Parcel"
        },
        To: [{
          Email: recipient.email,
          Name: recipient.name
        }],
        Subject: `Package Awaiting Payment - Tracking ID: ${trackingId}`,
        TextPart: `Your tracking ID is ${trackingId}`,
        HTMLPart: template
      }]
    });
  }));

  await Promise.all(emailRequests);
}

module.exports = { sendParcelEmails, sendRequestEmails };

async function getRequestEmailTemplate(recipient, data) {
  const baseStyle = `
    <style>
      @media only screen and (max-width: 600px) {
        .container { width: 100% !important; }
        .content { padding: 15px !important; }
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        font-family: Arial, sans-serif;
        background: #ffffff;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 2px 15px rgba(0,0,0,0.1);
      }
      .header {
        background: linear-gradient(135deg, #4A148C 0%, #7B1FA2 100%);
        padding: 30px;
        text-align: center;
        color: white;
      }
      .logo {
        width: 150px;
        margin-bottom: 20px;
      }
      .content {
        padding: 40px;
        color: #333;
        line-height: 1.6;
      }
      .highlight-box {
        background: #F3E5F5;
        border-left: 4px solid #7B1FA2;
        padding: 20px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .tracking-number {
        font-size: 24px;
        color: #4A148C;
        font-weight: bold;
        letter-spacing: 1px;
      }
      .cta-button {
        background: #7B1FA2;
        color: white;
        padding: 15px 30px;
        text-decoration: none;
        border-radius: 25px;
        display: inline-block;
        margin: 20px 0;
        font-weight: bold;
        text-align: center;
      }
      .contact-info {
        background: #EDE7F6;
        padding: 20px;
        border-radius: 8px;
        margin: 20px 0;
      }
      .security-note {
        font-size: 14px;
        color: #666;
        border-top: 1px solid #eee;
        margin-top: 30px;
        padding-top: 20px;
      }
      .footer {
        background: #F3E5F5;
        padding: 20px;
        text-align: center;
        font-size: 14px;
        color: #666;
      }
    </style>
  `;

  const commonTemplate = await getCommonTemplate(data);

  const templates = {
    'request-sender': `
      ${baseStyle}
      <div class="container">
        <div class="header">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="176" height="50">
          <path d="M0 0 C9.57 0 19.14 0 29 0 C29 3.96 29 7.92 29 12 C23.72 12 18.44 12 13 12 C13 13.32 13 14.64 13 16 C13.98742188 15.97679687 14.97484375 15.95359375 15.9921875 15.9296875 C17.27351563 15.91164063 18.55484375 15.89359375 19.875 15.875 C21.78925781 15.84019531 21.78925781 15.84019531 23.7421875 15.8046875 C27 16 27 16 29 18 C29.7425 17.525625 30.485 17.05125 31.25 16.5625 C35.88580728 13.92851859 39.65686374 13.63775347 45 14 C49.59914702 15.55903289 52.92524335 17.18730175 56 21 C56 21.66 56 22.32 56 23 C56.6290625 22.43410156 57.258125 21.86820313 57.90625 21.28515625 C63.29058606 16.67116947 66.78311153 13.75535971 74 14 C75.65 14.66 77.3 15.32 79 16 C79.33 10.72 79.66 5.44 80 0 C92.87 0 105.74 0 119 0 C119 3.96 119 7.92 119 12 C114.05 12 109.1 12 104 12 C104 13.32 104 14.64 104 16 C104.85231201 15.9685791 105.70462402 15.9371582 106.58276367 15.90478516 C109.76024304 15.802223 112.93687639 15.72716415 116.11547852 15.67041016 C117.4881575 15.6403267 118.86064563 15.59944666 120.23266602 15.54736328 C131.68666078 15.12360287 131.68666078 15.12360287 135.04150391 17.36230469 C136.42578125 19.0234375 136.42578125 19.0234375 138 22 C138.804375 21.195625 139.60875 20.39125 140.4375 19.5625 C144 16 144 16 147.37890625 15.90234375 C148.77347077 15.90901631 150.16801743 15.92097468 151.5625 15.9375 C152.27341797 15.94201172 152.98433594 15.94652344 153.71679688 15.95117188 C155.47790013 15.96299136 157.23896036 15.98092737 159 16 C158.52042767 20.28553996 155.7812778 22.76931405 152.9375 25.75 C152.46505859 26.25660156 151.99261719 26.76320313 151.50585938 27.28515625 C150.34369289 28.52949613 149.17269839 29.76558064 148 31 C149.30553238 34.73382262 150.85666983 37.31545549 153.5 40.25 C154.1084375 40.93578125 154.716875 41.6215625 155.34375 42.328125 C156.91146401 44.0893479 156.91146401 44.0893479 159 45 C159 46.32 159 47.64 159 49 C156.41324275 48.96691357 153.83502562 48.89971107 151.25 48.8125 C150.52039063 48.80669922 149.79078125 48.80089844 149.0390625 48.79492188 C145.02307529 48.63063149 143.3538203 48.35876499 140.484375 45.44921875 C139.99453125 44.64097656 139.5046875 43.83273438 139 43 C135.83884224 44.36983503 135.0072908 44.9890638 133 48 C130.18359375 48.51171875 130.18359375 48.51171875 126.4375 48.6875 C125.75002686 48.72020996 125.06255371 48.75291992 124.35424805 48.78662109 C110.01669524 49.37398372 95.42689106 49.75157496 81.16015625 48.0234375 C80.44730469 48.01570313 79.73445313 48.00796875 79 48 C78.01 48.99 78.01 48.99 77 50 C72.02332573 50.76977336 68.01242388 50.50621194 63.5 48.25 C61.21748034 46.19573231 60.02106495 44.85898185 59 42 C55.82763643 42.80900253 55.82763643 42.80900253 53.5625 45.4375 C49.80211118 49.19788882 47.05627065 50.30863343 41.75 50.4375 C35.96581601 50.32166187 32.31210545 48.81494506 28 45 C24.3078034 41.12319357 23.77660477 38.31292951 23.75 33.125 C23.8325 31.43375 23.915 29.7425 24 28 C20.37 28 16.74 28 13 28 C13 34.6 13 41.2 13 48 C8.71 48 4.42 48 0 48 C0 32.16 0 16.32 0 0 Z M119 21 C119 23.31 119 25.62 119 28 C114.05 28 109.1 28 104 28 C104 30.64 104 33.28 104 36 C108.95 36 113.9 36 119 36 C119 38.64 119 41.28 119 44 C122.59634744 40.50640535 125.83451967 36.88901869 129 33 C127.56006357 29.78727751 125.76981628 27.3793336 123.4375 24.75 C122.81746094 24.04359375 122.19742188 23.3371875 121.55859375 22.609375 C121.04425781 22.07828125 120.52992187 21.5471875 120 21 C119.67 21 119.34 21 119 21 Z M37 26 C39.64 26 42.28 26 45 26 C44.67 25.34 44.34 24.68 44 24 C40.04542152 23.65176193 40.04542152 23.65176193 37 26 Z M70.25 26.5625 C68.53872796 29.89948048 68.59650069 32.30125632 69 36 C70.04374022 38.04451019 70.04374022 38.04451019 72 39 C74.54258463 39.50014953 74.54258463 39.50014953 77 39 C79.07358419 35.88962372 79.29487123 35.00438748 79.3125 31.4375 C79.32925781 30.65246094 79.34601563 29.86742187 79.36328125 29.05859375 C79.24339844 28.37925781 79.12351562 27.69992188 79 27 C75.7057927 24.8038618 73.47420568 23.68374493 70.25 26.5625 Z M36 36 C38.43442848 40.22463984 38.43442848 40.22463984 41.5625 40.375 C44.17528109 40.21896136 44.17528109 40.21896136 46 38 C48.3828125 37.5859375 48.3828125 37.5859375 51.125 37.375 C52.03507812 37.30023438 52.94515625 37.22546875 53.8828125 37.1484375 C54.58148438 37.09945312 55.28015625 37.05046875 56 37 C56 36.67 56 36.34 56 36 C49.4 36 42.8 36 36 36 Z " fill="#FFFEFE" transform="translate(0,0)"/>
          <path d="M0 0 C8.91 0 17.82 0 27 0 C27 3.96 27 7.92 27 12 C22.05 12 17.1 12 12 12 C12 13.32 12 14.64 12 16 C13.27846802 15.95286865 13.27846802 15.95286865 14.58276367 15.90478516 C17.76024304 15.802223 20.93687639 15.72716415 24.11547852 15.67041016 C25.4881575 15.6403267 26.86064563 15.59944666 28.23266602 15.54736328 C39.68666078 15.12360287 39.68666078 15.12360287 43.04150391 17.36230469 C44.42578125 19.0234375 44.42578125 19.0234375 46 22 C46.804375 21.195625 47.60875 20.39125 48.4375 19.5625 C52 16 52 16 55.37890625 15.90234375 C56.77347077 15.90901631 58.16801743 15.92097468 59.5625 15.9375 C60.27341797 15.94201172 60.98433594 15.94652344 61.71679688 15.95117188 C63.47790013 15.96299136 65.23896036 15.98092737 67 16 C66.52042767 20.28553996 63.7812778 22.76931405 60.9375 25.75 C60.46505859 26.25660156 59.99261719 26.76320313 59.50585938 27.28515625 C58.34369289 28.52949613 57.17269839 29.76558064 56 31 C57.30553238 34.73382262 58.85666983 37.31545549 61.5 40.25 C62.1084375 40.93578125 62.716875 41.6215625 63.34375 42.328125 C64.91146401 44.0893479 64.91146401 44.0893479 67 45 C67 46.32 67 47.64 67 49 C64.41324275 48.96691357 61.83502562 48.89971107 59.25 48.8125 C58.52039063 48.80669922 57.79078125 48.80089844 57.0390625 48.79492188 C53.02307529 48.63063149 51.3538203 48.35876499 48.484375 45.44921875 C47.99453125 44.64097656 47.5046875 43.83273438 47 43 C43.83884224 44.36983503 43.0072908 44.9890638 41 48 C38.18359375 48.51171875 38.18359375 48.51171875 34.4375 48.6875 C33.75945312 48.72093506 33.08140625 48.75437012 32.3828125 48.78881836 C21.6008121 49.24318243 10.78636538 49.05862155 0 49 C0 32.83 0 16.66 0 0 Z M27 21 C27 23.31 27 25.62 27 28 C22.05 28 17.1 28 12 28 C12 30.64 12 33.28 12 36 C16.95 36 21.9 36 27 36 C27 38.64 27 41.28 27 44 C30.59634744 40.50640535 33.83451967 36.88901869 37 33 C35.56006357 29.78727751 33.76981628 27.3793336 31.4375 24.75 C30.81746094 24.04359375 30.19742188 23.3371875 29.55859375 22.609375 C29.04425781 22.07828125 28.52992187 21.5471875 28 21 C27.67 21 27.34 21 27 21 Z " fill="#FF6600" transform="translate(92,0)"/>
          <path d="M0 0 C3.09443084 0.5415254 4.42308202 1.05289047 6.5 3.4375 C7.0625 6.875 7.0625 6.875 6.5 10.4375 C4.3125 12.9375 4.3125 12.9375 1.5 14.4375 C-1.39481608 14.36857581 -2.90685358 13.82611317 -5.3125 12.25 C-7.10972017 9.50687448 -6.95774125 7.64168874 -6.5 4.4375 C-4.51241034 1.64015158 -3.39834723 0.59471076 0 0 Z " fill="#FF6600" transform="translate(169.5,34.5625)"/>
          </svg>
          <h1>Package Collection Confirmation</h1>
        </div>
        <div class="content">
          <p>Dear ${data.senderName},</p>
          <p>We are pleased to confirm that your package has been successfully collected and is now in our secure facility. The package will be delivered to ${data.recipientName} once payment is processed.</p>
          <p style="margin:10px;">You can track your package using this tracking ID: <strong>${data.trackingId}</strong></p>
          ${commonTemplate}
          
          <div class="highlight-box">
            <h3>Package Details:</h3>
            <p><strong>Tracking ID:</strong> <span class="tracking-number">${data.trackingId}</span></p>
            <p><strong>Description:</strong> ${data.description}</p>
            <p><strong>Recipient:</strong> ${data.recipientName}</p>
            <p><strong>Shipping Fee:</strong> $${data.fee}</p>
          </div>

          <p>We have notified the recipient about the pending payment. Once the payment is processed, we will immediately proceed with the delivery.</p>
          
          <p>You can track your shipment status using the button below:</p>
          <a href="${process.env.PFRONTEND_URL}/track/${data.trackingId}" class="cta-button">Track Shipment</a>

          <div class="security-note">
            <p>🔒 Your package is securely stored in our facility and fully insured until delivery.</p>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} FedEx Premium Parcel. All rights reserved.</p>
          <p>Questions? Contact our 24/7 support: <a href="mailto:pj944944@gmail.com" 
         class="button">
        Email Support
      </a></p>
        </div>
      </div>
    `,
    'request-recipient': `
      ${baseStyle}
      <div class="container">
        <div class="header">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="176" height="50">
          <path d="M0 0 C9.57 0 19.14 0 29 0 C29 3.96 29 7.92 29 12 C23.72 12 18.44 12 13 12 C13 13.32 13 14.64 13 16 C13.98742188 15.97679687 14.97484375 15.95359375 15.9921875 15.9296875 C17.27351563 15.91164063 18.55484375 15.89359375 19.875 15.875 C21.78925781 15.84019531 21.78925781 15.84019531 23.7421875 15.8046875 C27 16 27 16 29 18 C29.7425 17.525625 30.485 17.05125 31.25 16.5625 C35.88580728 13.92851859 39.65686374 13.63775347 45 14 C49.59914702 15.55903289 52.92524335 17.18730175 56 21 C56 21.66 56 22.32 56 23 C56.6290625 22.43410156 57.258125 21.86820313 57.90625 21.28515625 C63.29058606 16.67116947 66.78311153 13.75535971 74 14 C75.65 14.66 77.3 15.32 79 16 C79.33 10.72 79.66 5.44 80 0 C92.87 0 105.74 0 119 0 C119 3.96 119 7.92 119 12 C114.05 12 109.1 12 104 12 C104 13.32 104 14.64 104 16 C104.85231201 15.9685791 105.70462402 15.9371582 106.58276367 15.90478516 C109.76024304 15.802223 112.93687639 15.72716415 116.11547852 15.67041016 C117.4881575 15.6403267 118.86064563 15.59944666 120.23266602 15.54736328 C131.68666078 15.12360287 131.68666078 15.12360287 135.04150391 17.36230469 C136.42578125 19.0234375 136.42578125 19.0234375 138 22 C138.804375 21.195625 139.60875 20.39125 140.4375 19.5625 C144 16 144 16 147.37890625 15.90234375 C148.77347077 15.90901631 150.16801743 15.92097468 151.5625 15.9375 C152.27341797 15.94201172 152.98433594 15.94652344 153.71679688 15.95117188 C155.47790013 15.96299136 157.23896036 15.98092737 159 16 C158.52042767 20.28553996 155.7812778 22.76931405 152.9375 25.75 C152.46505859 26.25660156 151.99261719 26.76320313 151.50585938 27.28515625 C150.34369289 28.52949613 149.17269839 29.76558064 148 31 C149.30553238 34.73382262 150.85666983 37.31545549 153.5 40.25 C154.1084375 40.93578125 154.716875 41.6215625 155.34375 42.328125 C156.91146401 44.0893479 156.91146401 44.0893479 159 45 C159 46.32 159 47.64 159 49 C156.41324275 48.96691357 153.83502562 48.89971107 151.25 48.8125 C150.52039063 48.80669922 149.79078125 48.80089844 149.0390625 48.79492188 C145.02307529 48.63063149 143.3538203 48.35876499 140.484375 45.44921875 C139.99453125 44.64097656 139.5046875 43.83273438 139 43 C135.83884224 44.36983503 135.0072908 44.9890638 133 48 C130.18359375 48.51171875 130.18359375 48.51171875 126.4375 48.6875 C125.75002686 48.72020996 125.06255371 48.75291992 124.35424805 48.78662109 C110.01669524 49.37398372 95.42689106 49.75157496 81.16015625 48.0234375 C80.44730469 48.01570313 79.73445313 48.00796875 79 48 C78.01 48.99 78.01 48.99 77 50 C72.02332573 50.76977336 68.01242388 50.50621194 63.5 48.25 C61.21748034 46.19573231 60.02106495 44.85898185 59 42 C55.82763643 42.80900253 55.82763643 42.80900253 53.5625 45.4375 C49.80211118 49.19788882 47.05627065 50.30863343 41.75 50.4375 C35.96581601 50.32166187 32.31210545 48.81494506 28 45 C24.3078034 41.12319357 23.77660477 38.31292951 23.75 33.125 C23.8325 31.43375 23.915 29.7425 24 28 C20.37 28 16.74 28 13 28 C13 34.6 13 41.2 13 48 C8.71 48 4.42 48 0 48 C0 32.16 0 16.32 0 0 Z M119 21 C119 23.31 119 25.62 119 28 C114.05 28 109.1 28 104 28 C104 30.64 104 33.28 104 36 C108.95 36 113.9 36 119 36 C119 38.64 119 41.28 119 44 C122.59634744 40.50640535 125.83451967 36.88901869 129 33 C127.56006357 29.78727751 125.76981628 27.3793336 123.4375 24.75 C122.81746094 24.04359375 122.19742188 23.3371875 121.55859375 22.609375 C121.04425781 22.07828125 120.52992187 21.5471875 120 21 C119.67 21 119.34 21 119 21 Z M37 26 C39.64 26 42.28 26 45 26 C44.67 25.34 44.34 24.68 44 24 C40.04542152 23.65176193 40.04542152 23.65176193 37 26 Z M70.25 26.5625 C68.53872796 29.89948048 68.59650069 32.30125632 69 36 C70.04374022 38.04451019 70.04374022 38.04451019 72 39 C74.54258463 39.50014953 74.54258463 39.50014953 77 39 C79.07358419 35.88962372 79.29487123 35.00438748 79.3125 31.4375 C79.32925781 30.65246094 79.34601563 29.86742187 79.36328125 29.05859375 C79.24339844 28.37925781 79.12351562 27.69992188 79 27 C75.7057927 24.8038618 73.47420568 23.68374493 70.25 26.5625 Z M36 36 C38.43442848 40.22463984 38.43442848 40.22463984 41.5625 40.375 C44.17528109 40.21896136 44.17528109 40.21896136 46 38 C48.3828125 37.5859375 48.3828125 37.5859375 51.125 37.375 C52.03507812 37.30023438 52.94515625 37.22546875 53.8828125 37.1484375 C54.58148438 37.09945312 55.28015625 37.05046875 56 37 C56 36.67 56 36.34 56 36 C49.4 36 42.8 36 36 36 Z " fill="#FFFEFE" transform="translate(0,0)"/>
          <path d="M0 0 C8.91 0 17.82 0 27 0 C27 3.96 27 7.92 27 12 C22.05 12 17.1 12 12 12 C12 13.32 12 14.64 12 16 C13.27846802 15.95286865 13.27846802 15.95286865 14.58276367 15.90478516 C17.76024304 15.802223 20.93687639 15.72716415 24.11547852 15.67041016 C25.4881575 15.6403267 26.86064563 15.59944666 28.23266602 15.54736328 C39.68666078 15.12360287 39.68666078 15.12360287 43.04150391 17.36230469 C44.42578125 19.0234375 44.42578125 19.0234375 46 22 C46.804375 21.195625 47.60875 20.39125 48.4375 19.5625 C52 16 52 16 55.37890625 15.90234375 C56.77347077 15.90901631 58.16801743 15.92097468 59.5625 15.9375 C60.27341797 15.94201172 60.98433594 15.94652344 61.71679688 15.95117188 C63.47790013 15.96299136 65.23896036 15.98092737 67 16 C66.52042767 20.28553996 63.7812778 22.76931405 60.9375 25.75 C60.46505859 26.25660156 59.99261719 26.76320313 59.50585938 27.28515625 C58.34369289 28.52949613 57.17269839 29.76558064 56 31 C57.30553238 34.73382262 58.85666983 37.31545549 61.5 40.25 C62.1084375 40.93578125 62.716875 41.6215625 63.34375 42.328125 C64.91146401 44.0893479 64.91146401 44.0893479 67 45 C67 46.32 67 47.64 67 49 C64.41324275 48.96691357 61.83502562 48.89971107 59.25 48.8125 C58.52039063 48.80669922 57.79078125 48.80089844 57.0390625 48.79492188 C53.02307529 48.63063149 51.3538203 48.35876499 48.484375 45.44921875 C47.99453125 44.64097656 47.5046875 43.83273438 47 43 C43.83884224 44.36983503 43.0072908 44.9890638 41 48 C38.18359375 48.51171875 38.18359375 48.51171875 34.4375 48.6875 C33.75945312 48.72093506 33.08140625 48.75437012 32.3828125 48.78881836 C21.6008121 49.24318243 10.78636538 49.05862155 0 49 C0 32.83 0 16.66 0 0 Z M27 21 C27 23.31 27 25.62 27 28 C22.05 28 17.1 28 12 28 C12 30.64 12 33.28 12 36 C16.95 36 21.9 36 27 36 C27 38.64 27 41.28 27 44 C30.59634744 40.50640535 33.83451967 36.88901869 37 33 C35.56006357 29.78727751 33.76981628 27.3793336 31.4375 24.75 C30.81746094 24.04359375 30.19742188 23.3371875 29.55859375 22.609375 C29.04425781 22.07828125 28.52992187 21.5471875 28 21 C27.67 21 27.34 21 27 21 Z " fill="#FF6600" transform="translate(92,0)"/>
          <path d="M0 0 C3.09443084 0.5415254 4.42308202 1.05289047 6.5 3.4375 C7.0625 6.875 7.0625 6.875 6.5 10.4375 C4.3125 12.9375 4.3125 12.9375 1.5 14.4375 C-1.39481608 14.36857581 -2.90685358 13.82611317 -5.3125 12.25 C-7.10972017 9.50687448 -6.95774125 7.64168874 -6.5 4.4375 C-4.51241034 1.64015158 -3.39834723 0.59471076 0 0 Z " fill="#FF6600" transform="translate(169.5,34.5625)"/>
          </svg>
          <h1>Package Awaiting Your Payment</h1>
        </div>
        <div class="content">
          <p>Dear ${data.recipientName},</p>
          <p>A package from ${data.senderName} is ready and has been picked up for delivery. To complete the delivery, please process the shipping payment using one of the methods below.</p>
          
          <div class="highlight-box">
            <h3>Package Details:</h3>
            <p><strong>Tracking ID:</strong> <span class="tracking-number">${data.trackingId}</span></p>
            <p><strong>Description:</strong> ${data.description}</p>
            <p><strong>Sender:</strong> ${data.senderName}</p>
            <p><strong>Shipping Fee:</strong> $${data.fee}</p>
            <p style="margin:10px;">You can track your package using this tracking ID: <strong>${data.trackingId}</strong></p>
          ${commonTemplate}
          </div>

          <div class="contact-info">
            <h3>Payment Options:</h3>
            <ol>
              <li>Visit our website and use the live chat with your tracking ID, for us to track and process your payment</li>
              <li>Reply to this email directly</li>
            </ol>
          </div>

          <p><strong>Why choose FedEx Premium Parcel?</strong></p>
          <ul>
            <li>✓ Fully insured shipments</li>
            <li>✓ Real-time tracking</li>
            <li>✓ Secure payment processing</li>
            <li>✓ 24/7 customer support</li>
          </ul>

          <a href="${process.env.PFRONTEND_URL}/payment/${data.trackingId}" class="cta-button">Process Payment Now</a>

          <div class="security-note">
            <p>🔒 This is a legitimate request from FedEx Premium Parcel. Your package is securely stored in our facility and delivery will start promptly after payment confirmation.</p>
            <p>For your security, always verify our official contact information and website domain.</p>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} FedEx Premium Parcel. All rights reserved.</p>
          <p>Authorized by Federal Express Corporation</p>
          <p>Questions? Contact our 24/7 support: <a href="mailto:pj944944@gmail.com" 
         class="button">
        Email Support
      </a></p>
        </div>
      </div>
    `
  };

  return templates[recipient.type] || templates['request-recipient'];
}
