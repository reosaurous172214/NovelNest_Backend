import mongoose from "mongoose";

const moderationLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actionType: { type: String, enum: ['DELETE_NOVEL', 'BAN_USER'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reason: { type: String, default: "No reason provided" },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("ModerationLog", moderationLogSchema);