import mongoose from 'mongoose';

const saleLine = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPriceCents: { type: Number, required: true, min: 0 },
  unitCostCents: { type: Number, min: 0, default: 0 },
  lineTotalCents: { type: Number, required: true, min: 0 }
}, { _id: false });

const saleSchema = new mongoose.Schema({
  checkoutKey: { type: String, required: true, unique: true },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: { type: String, trim: true, maxlength: 100, default: '' },
  items: { type: [saleLine], required: true },
  totalCents: { type: Number, required: true, min: 0 },
  paidCents: { type: Number, required: true, min: 0 },
  changeCents: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ['cash'], default: 'cash' }
}, { timestamps: true });

export default mongoose.model('Sale', saleSchema);
