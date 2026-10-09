import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const safeUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role });

router.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }), async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ message: 'Valid email and password are required' });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
    const valid = user?.active && await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid email or password' });
    const token = jwt.sign({}, process.env.JWT_SECRET, { subject: user.id, expiresIn: '8h', algorithm: 'HS256' });
    return res.json({ token, user: safeUser(user) });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ message: 'Unable to log in' });
  }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: safeUser(req.user) }));

router.get('/admin-check', requireAuth, requireRole('admin'), (_req, res) => res.json({ message: 'Admin access granted' }));

export default router;
