import { Router } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function validatedProduct(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const sku = typeof body.sku === 'string' ? body.sku.trim().toUpperCase() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const price = Number(body.price);
  const quantity = Number(body.quantity);
  const lowStockAt = Number(body.lowStockAt);
  if (!name || name.length > 120 || !sku || sku.length > 40 || !/^[A-Z0-9_-]+$/.test(sku) || !category || category.length > 60 ||
      !Number.isFinite(price) || price < 0 || !Number.isInteger(Math.round(price * 100)) ||
      Math.abs(price * 100 - Math.round(price * 100)) > 0.000001 || !Number.isSafeInteger(Math.round(price * 100)) ||
      !Number.isSafeInteger(quantity) || quantity < 0 || !Number.isSafeInteger(lowStockAt) || lowStockAt < 0) {
    throw Error('Check name, SKU, category, price, stock quantity and alert level');
  }
  return { name, sku, category, priceCents: Math.round(price * 100), quantity, lowStockAt };
}

const format = item => ({
  id: item.id, name: item.name, sku: item.sku, category: item.category,
  price: item.priceCents / 100, quantity: item.quantity, lowStockAt: item.lowStockAt
});

router.get('/', async (req, res) => {
  try {
    const items = await Product.find({ archived: false }).sort({ updatedAt: -1 }).limit(1000);
    res.json({ products: items.map(format) });
  } catch (_error) { res.status(500).json({ message: 'Unable to load products' }); }
});

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const item = await Product.create(validatedProduct(req.body || {}));
    res.status(201).json({ product: format(item) });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : error.message.startsWith('Check ') ? 400 : 500)
      .json({ message: error.code === 11000 ? 'SKU already exists' : error.message.startsWith('Check ') ? error.message : 'Unable to create product' });
  }
});

router.put('/:id', requireRole('admin'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid product ID' });
  try {
    const item = await Product.findOneAndUpdate({ _id: req.params.id, archived: false }, validatedProduct(req.body || {}), { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Product not found' });
    res.json({ product: format(item) });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : error.message.startsWith('Check ') ? 400 : 500)
      .json({ message: error.code === 11000 ? 'SKU already exists' : error.message.startsWith('Check ') ? error.message : 'Unable to update product' });
  }
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
