import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    actionType: {
      type: String,
      enum: [
        "READ_CHAPTER",
        "READ_NOVEL",
        "FAVORITE_NOVEL",
        "BOOKMARK_NOVEL",
        "CREATE_NOVEL",
        "UPDATE_NOVEL",
        "DELETE_NOVEL",
        "PUBLISH_NOVEL",
        "CREATE_CHAPTER",
        "UPDATE_CHAPTER",
        "DELETE_CHAPTER",
        "WRITE_COMMENT",
        "READ_COMMENT",
        "FOLLOW_USER",
      ],
      required: true,
    },

    targetType: {
      type: String,
      enum: ["NOVEL", "CHAPTER", "USER"],
      required: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    meta: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

// 🔥 Critical for dashboard speed
activitySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Activity", activitySchema);
