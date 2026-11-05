const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'tapslog_super_secret_jwt_key_2026';

/**
 * Middleware: Verify JWT and ensure user has 'ADMIN' privileges.
 */
const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Missing or malformed authorization header.'
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token.'
      });
    }

    // Verify user exists in database and retains ADMIN role
    const userRes = await db.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin account not found.'
      });
    }

    const user = userRes.rows[0];
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Administrative privileges required.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[AdminAuth Middleware Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server authorization error.'
    });
  }
};

module.exports = adminAuth;