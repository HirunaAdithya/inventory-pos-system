import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const user = await User.findById(payload.sub).select('name email role active');
    if (!user?.active) return res.status(401).json({ message: 'Account unavailable' });
    req.user = user;
    next();
  } catch (_error) {
    res.status(401).json({ message: 'Invalid or expired session' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.user?.role)
    ? next() : res.status(403).json({ message: 'Permission denied' });
}
