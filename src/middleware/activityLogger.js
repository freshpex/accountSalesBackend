const UserProfile = require('../models/UserProfile');

const logLoginActivity = async (userId, device, location) => {
  try {
    await UserProfile.findOneAndUpdate(
      { userId },
      {
        $push: {
          'securitySettings.loginHistory': {
            device,
            location,
            timestamp: new Date()
          }
        }
      }
    );
  } catch (error) {
    console.error('Failed to log login activity:', error);
  }
};

module.exports = { logLoginActivity };
