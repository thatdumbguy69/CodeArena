const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'codearena_super_secret_jwt_key_2026';

const authMiddleware = (req, res, next) => {
  const tokenHeader = req.headers.authorization;
  if (!tokenHeader || !tokenHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No authorization token provided' });
  }

  const token = tokenHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired authorization token' });
  }
};

const adminOnlyMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admin privileges required' });
  }
  next();
};

const optionalAuthMiddleware = (req, res, next) => {
  const tokenHeader = req.headers.authorization;
  if (tokenHeader && tokenHeader.startsWith('Bearer ')) {
    const token = tokenHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Ignore token verification errors for optional auth
    }
  }
  next();
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  adminOnlyMiddleware,
  JWT_SECRET
};
