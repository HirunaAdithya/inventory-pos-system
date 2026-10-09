import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, required: true },
  type: { type: String, enum: ['opening','adjustment','sale','refund'], required: true },
  change: { type: Number, required: true },
  after: { type: Number, required: true, min: 0 },
  note: { type: String, trim: true, maxlength: 240, default: '' },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' }
}, { timestamps: true });
schema.index({ product: 1, createdAt: -1 });
export default mongoose.model('StockMovement', schema);
