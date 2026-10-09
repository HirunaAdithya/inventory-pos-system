import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 40 },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  priceCents: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 0 },
  lowStockAt: { type: Number, required: true, min: 0, default: 5 },
  archived: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
