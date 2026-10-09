import { Router } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import StockMovement from '../models/StockMovement.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const present = sale => ({
  id: sale.id, createdAt: sale.createdAt, customerName: sale.customerName,
  paymentMethod: sale.paymentMethod || 'cash', demoPaymentReference: sale.demoPaymentReference || '',
  items: sale.items.map(p => ({ sku: p.sku, name: p.name, quantity: p.quantity, price: p.unitPriceCents / 100, tax: (p.unitTaxCents || 0) * p.quantity / 100, total: p.lineTotalCents / 100 })),
  subtotal: (sale.subtotalCents || sale.totalCents) / 100, tax: (sale.taxCents || 0) / 100,
  total: sale.totalCents / 100, paid: sale.paidCents / 100, change: sale.changeCents / 100
});

router.post('/checkout', async (req, res) => {
  const { checkoutKey, items, customerName = '', paid, paymentMethod = 'cash' } = req.body || {};
  if (typeof checkoutKey !== 'string' || !/^[a-zA-Z0-9-]{20,80}$/.test(checkoutKey) ||
      !['cash','card_demo'].includes(paymentMethod) || !Array.isArray(items) || items.length < 1 || items.length > 100 || typeof customerName !== 'string' || customerName.length > 100 ||
      (paymentMethod === 'cash' && (!Number.isFinite(Number(paid)) || Number(paid) < 0 ||
      Math.abs(Number(paid) * 100 - Math.round(Number(paid) * 100)) > 0.000001 ||
      !Number.isSafeInteger(Math.round(Number(paid) * 100))))) {
    return res.status(400).json({ message: 'Invalid checkout details' });
  }
  const ids = new Set();
  for (const line of items) {
    if (!line || !mongoose.isValidObjectId(line.productId) || !Number.isSafeInteger(line.quantity) || line.quantity < 1 || ids.has(line.productId)) {
      return res.status(400).json({ message: 'Invalid or duplicate cart item' });
    }
    ids.add(line.productId);
  }
  const cashPaidCents = paymentMethod === 'cash' ? Math.round(Number(paid) * 100) : 0;
  const vatRateBps = Number(process.env.VAT_RATE_BPS ?? 1800);
  const session = await mongoose.startSession();
  try {
    let completed;
    await session.withTransaction(async () => {
      const previous = await Sale.findOne({ checkoutKey }).session(session);
      if (previous) { completed = previous; return; }
      const lines = [];
      const movements = [];
      let totalCents = 0;
      let subtotalCents = 0;
      let taxCents = 0;
      for (const line of items) {
        // Conditional update makes overselling fail even when another checkout races us.
        const product = await Product.findOneAndUpdate(
          { _id: line.productId, archived: false, quantity: { $gte: line.quantity } },
          { $inc: { quantity: -line.quantity } },
          { new: false, session }
        );
        if (!product) { const e = Error('A product is missing or has insufficient stock. Refresh the cart.'); e.status = 409; throw e; }
        const unitTaxCents = product.taxMode === 'standard' ? Math.round(product.priceCents * vatRateBps / 10000) : 0;
        const lineSubtotalCents = product.priceCents * line.quantity;
        const lineTaxCents = unitTaxCents * line.quantity;
        const lineTotalCents = lineSubtotalCents + lineTaxCents;
        if (!Number.isSafeInteger(lineTotalCents) || !Number.isSafeInteger(unitTaxCents)) { const e = Error('Cart total too large'); e.status = 400; throw e; }
        subtotalCents += lineSubtotalCents;
        taxCents += lineTaxCents;
        totalCents += lineTotalCents;
        lines.push({ productId: product.id, sku: product.sku, name: product.name, quantity: line.quantity, unitPriceCents: product.priceCents, unitTaxCents, taxMode: product.taxMode || 'zero', unitCostCents: product.costCents || 0, lineTotalCents });
        movements.push({ product: product.id, sku: product.sku, type: 'sale', change: -line.quantity, after: product.quantity - line.quantity, note: 'POS checkout', actor: req.user.id });
      }
      if (!Number.isSafeInteger(totalCents) || !Number.isSafeInteger(subtotalCents) || !Number.isSafeInteger(taxCents) || (paymentMethod === 'cash' && cashPaidCents < totalCents)) { const e = Error('Cash received must cover the total amount'); e.status = 400; throw e; }
      const paidCents = paymentMethod === 'card_demo' ? totalCents : cashPaidCents;
      const [sale] = await Sale.create([{ checkoutKey, cashier: req.user.id, customerName: customerName.trim(), items: lines, subtotalCents, taxCents, totalCents, paidCents, changeCents: paidCents - totalCents, paymentMethod, demoPaymentReference: paymentMethod === 'card_demo' ? `DEMO-${checkoutKey.slice(0, 8).toUpperCase()}` : '' }], { session, ordered: true });
      await StockMovement.create(movements.map(m => ({ ...m, sale: sale.id })), { session, ordered: true });
      completed = sale;
    });
    res.status(201).json({ sale: present(completed) });
  } catch (error) {
    if (error.code === 11000) {
      const existing = await Sale.findOne({ checkoutKey });
      if (existing) return res.json({ sale: present(existing) });
    }
    console.error('Checkout error:', error.message);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Checkout failed; no sale completed. Please retry.' });
  } finally { await session.endSession(); }
});

export default router;
