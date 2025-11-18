const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Generate JWT token for user
 */
function generateToken(payload) {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiry
  });
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Generate guest user token
 */
function generateGuestToken(name = 'Guest') {
  const userId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    token: generateToken({
      sub: userId,
      name: name,
      isGuest: true,
      iat: Math.floor(Date.now() / 1000)
    }),
    userId
  };
}

module.exports = {
  generateToken,
  verifyToken,
  generateGuestToken
};