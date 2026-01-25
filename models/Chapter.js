import mongoose from "mongoose";
const chapterSchema = new mongoose.Schema({
  novelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Novel",
    required: true,
  },
    title: {
    type: String,
    required: true,
  },
    chapterNumber: {
    type: Number,
    required: true,
  },
    content: {
    type: String,
    required: true,
  },
    createdAt: {
    type: Date,
    default: Date.now,
    },
    updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Chapter", chapterSchema);