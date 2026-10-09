import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'inventory-pos-api' }));

app.get('/api/health/database', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ database: connected ? 'connected' : 'disconnected' });
});

const port = Number(process.env.PORT || 5000);
const uri = process.env.MONGODB_URI;

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
