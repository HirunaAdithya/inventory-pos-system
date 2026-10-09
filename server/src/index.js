import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import salesRouter from './routes/sales.js';
import managementRouter from './routes/management.js';
import reportsRouter from './routes/reports.js';
import refundsRouter from './routes/refunds.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '64kb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/manage', managementRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/refunds', refundsRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'inventory-pos-api' }));
app.get('/api/config', (_req, res) => res.json({ vatRateBps: Number(process.env.VAT_RATE_BPS ?? 1800), currency: 'LKR', cardDemoOnly: true }));

app.get('/api/health/database', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ database: connected ? 'connected' : 'disconnected' });
});

const port = Number(process.env.PORT || 5000);
const uri = process.env.MONGODB_URI;
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('replace_')) {
  console.error('Set JWT_SECRET in server/.env to a random string of 32+ characters.');
  process.exit(1);
}
const vatRate = Number(process.env.VAT_RATE_BPS ?? '1800');
if (!Number.isSafeInteger(vatRate) || vatRate < 0 || vatRate > 10000) {
  console.error('VAT_RATE_BPS must be an integer from 0 to 10000 (e.g. 1800 = 18%).');
  process.exit(1);
}

if (!uri) {
  console.error('Missing MONGODB_URI. Copy server/.env.example to server/.env and configure it.');
  process.exit(1);
}

mongoose.connect(uri)
  .then(() => {
    app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });
