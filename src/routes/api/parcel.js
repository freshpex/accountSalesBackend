const express = require('express');
const router = express.Router();
const { sendParcelEmails, sendRequestEmails } = require('../../utils/parcelEmail');

router.post('/send-email', async (req, res) => {
  try {
    await sendParcelEmails(req.body);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ error: 'Failed to send emails' });
  }
});

router.post('/request', async (req, res) => {
  try {
    await sendRequestEmails(req.body);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ error: 'Failed to send emails' });
  }
});

module.exports = router;
