// models/Novel.js
import mongoose from "mongoose";

const novelSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, maxlength: 5000 },
    genres: { type: [String], required: true, index: true },
    tags: { type: [String], index: true },
    coverImage: { type: String, default: "" },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    isPublished: { type: Boolean, default: false, index: true },
    views: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalChapters: { type: Number, default: 0 },

    // 🚀 NEW FIELD: Pre-calculated similar novel IDs
    recommendations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Novel"
    }]
  },
  { timestamps: true }
);

export default mongoose.model("Novel", novelSchema);