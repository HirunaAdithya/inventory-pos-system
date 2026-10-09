import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true, maxlength: 80 },
  subjectId: { type: String, required: true, maxlength: 100 },
  note: { type: String, trim: true, maxlength: 240, default: '' }
}, { timestamps: true });
schema.index({ createdAt: -1 });
export default mongoose.model('AuditLog', schema);
