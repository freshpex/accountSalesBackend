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
  const baseTemplate = `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h1 style="font-size: 30px;">Parcel <span style="color: green;">Company</span></h1>
      <h2 style="color: green; margin:10px;">Hello ${recipient.name}!</h2>
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
    <a href="https://your-vercel-url.vercel.app/track/${data.trackingId}" 
       style="margin:10px 10px; padding: 5px 7px; border:2px solid green; 
              border-radius: 7px; color: green; text-decoration: none; font-weight:600;">
      Track Your Shipment
    </a>
    </div>
  `;

  return templates[recipient.type] + commonFooter;
}
