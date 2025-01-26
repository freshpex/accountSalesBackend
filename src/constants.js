exports.SECURITY_TYPES = {
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true
  },
  LOGIN_HISTORY: {
    MAX_ENTRIES: 10
  }
};

exports.NOTIFICATION_TYPES = {
  EMAIL: ['newsUpdates', 'accountActivity', 'promotions'],
  PUSH: ['newMessages', 'mentions', 'reminders'],
  SMS: ['security', 'orders'],
  BROWSER: ['desktop', 'sound', 'background']
};
