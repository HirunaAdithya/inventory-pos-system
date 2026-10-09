import mongoose from 'mongoose';
const schema = new mongoose.Schema({ name: { type: String, trim: true, required: true, unique: true, maxlength: 60 } }, { timestamps: true });
export default mongoose.model('Category', schema);
