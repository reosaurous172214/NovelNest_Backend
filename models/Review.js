import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  novelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Novel', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxLength: 500 },
}, { timestamps: true });

// CRITICAL: One user, one review per novel.
reviewSchema.index({ novelId: 1, userId: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);