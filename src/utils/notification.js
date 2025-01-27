const Notification = require('../models/Notification');

const sendNotification = async (userId, title, message) => {
  try {
    const notification = new Notification({
      userId,
      title,
      message,
      read: false
    });
    await notification.save();
  } catch (error) {
    console.error('Notification error:', error);
  }
};

module.exports = sendNotification;
