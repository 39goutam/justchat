const { verifyToken } = require('../utils/jwt');

/**
 * Express middleware for JWT authentication
 */
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Socket.IO middleware for JWT authentication
 */
function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const payload = verifyToken(token);
    socket.user = {
      id: payload.sub,
      name: payload.name,
      isGuest: payload.isGuest || false
    };
    next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid token'));
  }
}

module.exports = {
  authenticateJWT,
  socketAuth
};