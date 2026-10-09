import { Router } from 'express';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/summary', async (_req, res) => {
  try {
    const sriLankaOffsetMs = 330 * 60 * 1000;
    const localDay = new Date(Date.now() + sriLankaOffsetMs); localDay.setUTCHours(0, 0, 0, 0);
    const todayStart = new Date(localDay.getTime() - sriLankaOffsetMs);
    const [products, lowStock, totals, recent, todayTotals, costs] = await Promise.all([
      Product.countDocuments({ archived: false }),
      Product.countDocuments({ archived: false, $expr: { $lte: ['$quantity', '$lowStockAt'] } }),
      Sale.aggregate([{ $group: { _id: null, revenueCents: { $sum: '$totalCents' }, transactions: { $sum: 1 } } }]),
      Sale.find().sort({ createdAt: -1 }).limit(100).populate('cashier', 'name').lean(),
      Sale.aggregate([{ $match: { createdAt: { $gte: todayStart } } }, { $group: { _id: null, total: { $sum: '$totalCents' } } }]),
      Sale.aggregate([{ $unwind: '$items' }, { $group: { _id: null, totalCostCents: { $sum: { $multiply: [{ $ifNull: ['$items.unitCostCents', 0] }, '$items.quantity'] } } } }])
    ]);
    res.json({ summary: { products, lowStock, transactions: totals[0]?.transactions || 0, revenue: (totals[0]?.revenueCents || 0) / 100, estimatedGrossProfit: ((totals[0]?.revenueCents || 0) - (costs[0]?.totalCostCents || 0)) / 100, todayRevenue: (todayTotals[0]?.total || 0) / 100 },
      sales: recent.map(s => ({ id: String(s._id), date: s.createdAt, cashier: s.cashier?.name || 'Unknown', customer: s.customerName || 'Walk-in', items: s.items.reduce((a, i) => a + i.quantity, 0), total: s.totalCents / 100 })) });
  } catch (e) { console.error('Report error:', e.message); res.status(500).json({ message: 'Unable to load reports' }); }
});

export default router;
