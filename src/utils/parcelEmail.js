const mailjet = require('node-mailjet').apiConnect(
  process.env.MJ_APIKEY,
  process.env.MJ_SECRETKEY
);

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

  const emailRequests = recipients.map(recipient => {
    const template = getEmailTemplate(recipient, { 
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
  });

  await Promise.all(emailRequests);
}

module.exports = { sendParcelEmails };

function getEmailTemplate(recipient, data) {
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

  const baseTemplate = `
    ${baseStyle}
    <div class="container">
      <div class="header">
        <h1>Fedex Premium Parcel</h1>
        <p style="margin: 10px 0 0;">Your Trusted Shipping Partner</p>
      </div>
      <div class="content">
        <h2 style="color: #00873D;">Hello ${recipient.name}!</h2>
  `;

  const templates = {
    sender: `
      ${baseTemplate}
      <p style="font-size: 20px; margin:10px;">Your shipment has been processed successfully. We will contact you soon for the collection of your package.</p>
      <p style="margin:10px;">Amount paid: $${data.fee}</p>
      <p style="margin:10px;">Your tracking ID is: <strong>${data.trackingId}</strong></p>
      <p style="margin:10px;">Package will be delivered to: ${data.recipientName}</p>
    `,
    recipient: `
      ${baseTemplate}
      <p style="font-size: 20px; margin:10px;">A package is on its way to you from ${data.senderName}.</p>
      <p style="margin:10px;">You can track your package using this tracking ID: <strong>${data.trackingId}</strong></p>
    `,
    admin: `
      ${baseTemplate}
      <p style="font-size: 20px; margin:10px;">New shipment created</p>
      <p style="margin:10px;">Tracking ID: ${data.trackingId}</p>
      <p style="margin:10px;">From: ${data.senderName}</p>
      <p style="margin:10px;">To: ${data.recipientName}</p>
      <p style="margin:10px;">Amount: $${data.fee}</p>
    `
  };

  const commonFooter = `
      <div class="tracking-box">
        <img src="${process.env.FRONTEND_URL}/qr-code/${data.trackingId}.png" 
             alt="Tracking QR Code" 
             style="width: 150px; height: 150px; display: block; margin: 0 auto;">
      </div>
      <a href="${process.env.FRONTEND_URL}/track/${data.trackingId}" 
         class="button">
        Track Your Shipment
      </a>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Fedex Premium Parcel. All rights reserved.</p>
        <p>Need help? Contact us at support@fedexpremium.com</p>
        <div class="social-links">
          <a href="#">Facebook</a> | <a href="#">Twitter</a> | <a href="#">Instagram</a>
        </div>
      </div>
    </div>
  `;

  return templates[recipient.type] + commonFooter;
}
