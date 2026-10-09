import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' }
}, { timestamps: true });
export default mongoose.model('Supplier', schema);
