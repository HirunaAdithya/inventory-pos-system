import { Router } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function validatedProduct(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const sku = typeof body.sku === 'string' ? body.sku.trim().toUpperCase() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const supplierName = typeof body.supplierName === 'string' ? body.supplierName.trim() : '';
  const cost = Number(body.cost || 0);
  const taxMode = body.taxMode || 'zero';
  const price = Number(body.price);
  const quantity = Number(body.quantity);
  const lowStockAt = Number(body.lowStockAt);
  if (!name || name.length > 120 || !sku || sku.length > 40 || !/^[A-Z0-9_-]+$/.test(sku) || !category || category.length > 60 ||
      supplierName.length > 100 || !['standard','zero','exempt'].includes(taxMode) || !Number.isFinite(cost) || cost < 0 || !Number.isSafeInteger(Math.round(cost * 100)) || Math.abs(cost * 100 - Math.round(cost * 100)) > 0.000001 ||
      !Number.isFinite(price) || price < 0 || !Number.isInteger(Math.round(price * 100)) ||
      Math.abs(price * 100 - Math.round(price * 100)) > 0.000001 || !Number.isSafeInteger(Math.round(price * 100)) ||
      !Number.isSafeInteger(quantity) || quantity < 0 || !Number.isSafeInteger(lowStockAt) || lowStockAt < 0) {
    throw Error('Check name, SKU, category, price, stock quantity and alert level');
  }
  return { name, sku, category, supplierName, taxMode, costCents: Math.round(cost * 100), priceCents: Math.round(price * 100), quantity, lowStockAt };
}

const format = item => ({
  id: item.id, name: item.name, sku: item.sku, category: item.category,
  price: item.priceCents / 100, cost: (item.costCents || 0) / 100, supplierName: item.supplierName || '', taxMode: item.taxMode || 'zero', quantity: item.quantity, lowStockAt: item.lowStockAt
});

router.get('/', async (req, res) => {
  try {
    const items = await Product.find({ archived: false }).sort({ updatedAt: -1 }).limit(1000);
    res.json({ products: items.map(format) });
  } catch (_error) { res.status(500).json({ message: 'Unable to load products' }); }
});

router.post('/', requireRole('admin'), async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const values = validatedProduct(req.body || {});
    let item;
    await session.withTransaction(async () => {
      [item] = await Product.create([values], { session });
      if (item.quantity) await StockMovement.create([{ product: item.id, sku: item.sku, type: 'opening', change: item.quantity, after: item.quantity, note: 'Opening stock', actor: req.user.id }], { session });
    });
    res.status(201).json({ product: format(item) });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : error.message.startsWith('Check ') ? 400 : 500)
      .json({ message: error.code === 11000 ? 'SKU already exists' : error.message.startsWith('Check ') ? error.message : 'Unable to create product' });
  } finally { await session.endSession(); }
});

router.put('/:id', requireRole('admin'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid product ID' });
  const session = await mongoose.startSession();
  try {
    const values = validatedProduct(req.body || {});
    let item;
    await session.withTransaction(async () => {
      const previous = await Product.findOne({ _id: req.params.id, archived: false }).session(session);
      if (!previous) return;
      const delta = values.quantity - previous.quantity;
      item = await Product.findOneAndUpdate({ _id: req.params.id, archived: false }, values, { new: true, runValidators: true, session });
      if (delta) await StockMovement.create([{ product: item.id, sku: item.sku, type: 'adjustment', change: delta, after: item.quantity, note: 'Product edited', actor: req.user.id }], { session });
    });
    if (!item) return res.status(404).json({ message: 'Product not found' });
    res.json({ product: format(item) });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : error.message.startsWith('Check ') ? 400 : 500)
      .json({ message: error.code === 11000 ? 'SKU already exists' : error.message.startsWith('Check ') ? error.message : 'Unable to update product' });
  } finally { await session.endSession(); }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid product ID' });
  try {
    const item = await Product.findOneAndUpdate({ _id: req.params.id, archived: false }, { archived: true });
    if (!item) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product archived' });
  } catch (_error) { res.status(500).json({ message: 'Unable to archive product' }); }
});

export default router;
