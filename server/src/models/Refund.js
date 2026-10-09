import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  refundKey: { type: String, required: true, unique: true },
  sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{ productId: { type: mongoose.Schema.Types.ObjectId, required: true }, sku: String, name: String, quantity: Number, amountCents: Number }],
  amountCents: { type: Number, required: true, min: 0 },
  restocked: { type: Boolean, required: true },
  reason: { type: String, required: true, trim: true, maxlength: 240 },
  method: { type: String, enum: ['cash','card_demo'], required: true },
  status: { type: String, enum: ['recorded','simulated'], required: true }
}, { timestamps: true });

schema.index({ sale: 1, createdAt: -1 });
export default mongoose.model('Refund', schema);
