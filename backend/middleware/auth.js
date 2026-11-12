// ===== Authentication middleware =====

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'penworld-secret-key-change-in-production';

/**
 * Middleware to protect routes.
 * Expects Authorization: Bearer <token> header.
 */
function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. No token provided.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Token failed verification.'
    });
  }
}

/**
 * Middleware to check role.
 * @param {string|string[]} roles - Required roles (e.g., 'admin' or ['admin', 'teacher'])
 */
function roleCheck(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.'
      });
    }

    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    const userRole = req.user.role;

    if (!requiredRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${requiredRoles.join(' or ')}`
      });
    }

    next();
  };
}

module.exports = { protect, roleCheck, JWT_SECRET };
