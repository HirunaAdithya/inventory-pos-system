import { Router } from 'express';
import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Refund from '../models/Refund.js';
import StockMovement from '../models/StockMovement.js';
import AuditLog from '../models/AuditLog.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

const formatRefund = r => ({ id: String(r.id), saleId: String(r.sale), createdAt: r.createdAt, amount: r.amountCents / 100, items: r.items, restocked: r.restocked, reason: r.reason, method: r.method, status: r.status });

router.get('/recent', async (_req, res) => {
  try { res.json({ refunds: (await Refund.find().sort({ createdAt: -1 }).limit(100)).map(formatRefund) }); }
  catch (_error) { res.status(500).json({ message: 'Unable to load refunds' }); }
});

router.get('/sale/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid receipt ID' });
  const sale = await Sale.findById(req.params.id);
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  res.json({ sale: {
    id: sale.id, createdAt: sale.createdAt, method: sale.paymentMethod || 'cash',
    total: sale.totalCents / 100, refunded: (sale.refundedCents || 0) / 100,
    items: sale.items.map(i => ({ productId: String(i.productId), sku: i.sku, name: i.name, quantity: i.quantity, alreadyRefunded: i.refundedQuantity || 0, unitRefund: (i.unitPriceCents + (i.unitTaxCents || 0)) / 100 }))
  } });
});

router.post('/', async (req, res) => {
  const { saleId, refundKey, items, restock, reason } = req.body || {};
  if (!mongoose.isValidObjectId(saleId) || typeof refundKey !== 'string' || !/^[a-zA-Z0-9-]{20,80}$/.test(refundKey) ||
      !Array.isArray(items) || items.length < 1 || items.length > 100 || typeof restock !== 'boolean' || typeof reason !== 'string' || !reason.trim() || reason.length > 240) {
    return res.status(400).json({ message: 'Invalid refund details' });
  }
  const itemIds = new Set();
  for (const item of items) {
    if (!item || !mongoose.isValidObjectId(item.productId) || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || itemIds.has(item.productId)) return res.status(400).json({ message: 'Invalid or duplicate refund item' });
    itemIds.add(item.productId);
  }
  const session = await mongoose.startSession();
  try {
    let completed;
    await session.withTransaction(async () => {
      const previous = await Refund.findOne({ refundKey }).session(session);
      if (previous) {
        if (String(previous.sale) !== saleId) { const e = Error('Refund key was already used for another sale'); e.status = 409; throw e; }
        completed = previous; return;
      }
      const sale = await Sale.findById(saleId).session(session);
      if (!sale) { const e = Error('Sale not found'); e.status = 404; throw e; }
      const lines = []; let amountCents = 0;
      const movements = [];
      for (const requested of items) {
        const line = sale.items.find(i => String(i.productId) === requested.productId);
        if (!line || requested.quantity > line.quantity - (line.refundedQuantity || 0)) { const e = Error('Requested return exceeds items available for refund'); e.status = 409; throw e; }
        const lineAmount = (line.unitPriceCents + (line.unitTaxCents || 0)) * requested.quantity;
        if (!Number.isSafeInteger(lineAmount)) { const e = Error('Refund amount too large'); e.status = 400; throw e; }
        amountCents += lineAmount;
        line.refundedQuantity = (line.refundedQuantity || 0) + requested.quantity;
        lines.push({ productId: line.productId, sku: line.sku, name: line.name, quantity: requested.quantity, amountCents: lineAmount });
        if (restock) {
          const product = await Product.findByIdAndUpdate(line.productId, { $inc: { quantity: requested.quantity } }, { new: true, session });
          if (!product) { const e = Error('Original product no longer exists; cannot restock'); e.status = 409; throw e; }
          movements.push({ product: product.id, sku: product.sku, type: 'refund', change: requested.quantity, after: product.quantity, note: `Refund of sale ${sale.id}`, actor: req.user.id, sale: sale.id });
        }
      }
      if (!Number.isSafeInteger(amountCents) || (sale.refundedCents || 0) + amountCents > sale.totalCents) { const e = Error('Refund exceeds sale balance'); e.status = 409; throw e; }
      sale.refundedCents = (sale.refundedCents || 0) + amountCents;
      await sale.save({ session });
      const method = sale.paymentMethod || 'cash';
      [completed] = await Refund.create([{ refundKey, sale: sale.id, actor: req.user.id, items: lines, amountCents, restocked: restock, reason: reason.trim(), method, status: method === 'card_demo' ? 'simulated' : 'recorded' }], { session, ordered: true });
      if (movements.length) await StockMovement.create(movements, { session, ordered: true });
      await AuditLog.create([{ actor: req.user.id, action: 'refund.create', subjectId: sale.id, note: `${amountCents} cents; ${restock ? 'restocked' : 'not restocked'}` }], { session, ordered: true });
    });
    res.status(201).json({ refund: formatRefund(completed) });
  } catch (e) {
    if (e.code === 11000) {
      const previous = await Refund.findOne({ refundKey });
      if (previous && String(previous.sale) === saleId) return res.json({ refund: formatRefund(previous) });
    }
    console.error('Refund error:', e.message);
    res.status(e.status || 500).json({ message: e.status ? e.message : 'Refund failed; no return recorded' });
  } finally { await session.endSession(); }
});

export default router;
