const { SECURITY_TYPES } = require('../constants');

const validatePassword = (password) => {
  const { MIN_LENGTH, REQUIRE_UPPERCASE, REQUIRE_NUMBER, REQUIRE_SPECIAL } = SECURITY_TYPES.PASSWORD;

  if (!password || password.length < MIN_LENGTH) {
    return {
      isValid: false,
      error: `Password must be at least ${MIN_LENGTH} characters long`
    };
  }

  if (REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: 'Password must contain at least one uppercase letter'
    };
  }

  if (REQUIRE_NUMBER && !/\d/.test(password)) {
    return {
      isValid: false,
      error: 'Password must contain at least one number'
    };
  }

  if (REQUIRE_SPECIAL && !/[!@#$%^&*]/.test(password)) {
    return {
      isValid: false,
      error: 'Password must contain at least one special character'
    };
  }

  return { isValid: true };
};

module.exports = { validatePassword };
