import { Router } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Category from '../models/Category.js';
import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import StockMovement from '../models/StockMovement.js';
import AuditLog from '../models/AuditLog.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));
const fail = (res, error, fallback) => res.status(error.code === 11000 ? 409 : 400).json({ message: error.code === 11000 ? 'Name/email already exists' : error.message || fallback });

router.get('/categories', async (_req, res) => res.json({ categories: await Category.find().sort({ name: 1 }) }));
router.post('/categories', async (req, res) => {
  try { const name = String(req.body?.name || '').trim(); if (!name || name.length > 60) throw Error('Enter a category name'); res.status(201).json({ category: await Category.create({ name }) }); }
  catch (e) { fail(res, e, 'Unable to create category'); }
});
router.delete('/categories/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ message: 'Category not found' });
  if (await Product.exists({ category: category.name, archived: false })) return res.status(409).json({ message: 'Category is used by active products' });
  await category.deleteOne(); res.json({ message: 'Category deleted' });
});

router.get('/suppliers', async (_req, res) => res.json({ suppliers: await Supplier.find().sort({ name: 1 }) }));
router.post('/suppliers', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim(); const phone = String(req.body?.phone || '').trim(); const email = String(req.body?.email || '').trim();
    if (!name || name.length > 100 || phone.length > 30 || email.length > 254) throw Error('Invalid supplier details');
    res.status(201).json({ supplier: await Supplier.create({ name, phone, email }) });
  } catch (e) { fail(res, e, 'Unable to add supplier'); }
});
router.delete('/suppliers/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
  const supplier = await Supplier.findByIdAndDelete(req.params.id);
  res.status(supplier ? 200 : 404).json({ message: supplier ? 'Supplier deleted' : 'Supplier not found' });
});

router.get('/users', async (_req, res) => res.json({ users: await User.find().select('name email role active createdAt').sort({ createdAt: -1 }) }));
router.post('/users', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim(); const email = String(req.body?.email || '').trim().toLowerCase(); const password = req.body?.password;
    if (!name || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw Error('Enter name, valid email and password of 12–72 bytes');
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role: 'cashier' });
    await AuditLog.create({ actor: req.user.id, action: 'cashier.create', subjectId: user.id, note: 'Cashier account created' });
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { fail(res, e, 'Unable to add cashier'); }
});
router.patch('/users/:id/active', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id) || typeof req.body?.active !== 'boolean') return res.status(400).json({ message: 'Invalid request' });
  if (req.params.id === String(req.user.id)) return res.status(400).json({ message: 'You cannot disable your own account' });
  const user = await User.findByIdAndUpdate(req.params.id, { active: req.body.active }, { new: true }).select('name email role active');
  if (user) await AuditLog.create({ actor: req.user.id, action: 'cashier.status', subjectId: user.id, note: user.active ? 'enabled' : 'disabled' });
  res.status(user ? 200 : 404).json(user ? { user } : { message: 'User not found' });
});

router.get('/stock/movements', async (_req, res) => res.json({ movements: await StockMovement.find().sort({ createdAt: -1 }).limit(200).lean() }));
router.get('/audit', async (_req, res) => res.json({ logs: await AuditLog.find().sort({ createdAt: -1 }).limit(200).populate('actor','name').lean() }));
router.post('/stock/adjust', async (req, res) => {
  const { productId, change, note = '' } = req.body || {};
  if (!mongoose.isValidObjectId(productId) || !Number.isSafeInteger(change) || change === 0 || typeof note !== 'string' || note.length > 240) return res.status(400).json({ message: 'Enter a product, nonzero whole-number adjustment and optional note' });
  const session = await mongoose.startSession();
  try {
    let updated;
    await session.withTransaction(async () => {
      updated = await Product.findOneAndUpdate({ _id: productId, archived: false, ...(change < 0 ? { quantity: { $gte: -change } } : {}) }, { $inc: { quantity: change } }, { new: true, session });
      if (!updated) { const e = Error('Product missing or insufficient stock'); e.status = 409; throw e; }
      await StockMovement.create([{ product: updated.id, sku: updated.sku, type: 'adjustment', change, after: updated.quantity, note, actor: req.user.id }], { session, ordered: true });
      await AuditLog.create([{ actor: req.user.id, action: 'stock.adjust', subjectId: updated.id, note: `${change > 0 ? '+' : ''}${change} units; ${note}`.slice(0,240) }], { session, ordered: true });
    });
    res.json({ productId: updated.id, quantity: updated.quantity });
  } catch (e) { res.status(e.status || 500).json({ message: e.status ? e.message : 'Stock adjustment failed' }); }
  finally { await session.endSession(); }
});

export default router;
