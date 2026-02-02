import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Can be null for System/Chapter alerts
  type: {
    type: String,
    enum: ["LIKE", "REPLY", "NEW_CHAPTER", "NEW_COMMENT", "MILESTONE"],
    required: true,
  },
  novelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Novel",
  },
  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chapter",
  }, // For new uploads
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Notification", notificationSchema);
