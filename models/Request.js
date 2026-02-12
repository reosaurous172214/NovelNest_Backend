import mongoose from "mongoose";

const requestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["author_upgrade", "moderator_apply", "bug_report", "feature_suggestion", "other"],
      default: "author_upgrade",
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_review", "approved", "rejected", "resolved"],
      default: "pending",
    },
    adminNotes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Optional: Limit users to 3 open requests at a time to prevent spam
requestSchema.index({ user: 1, status: 1 });

const Request = mongoose.model("Request", requestSchema);

export default Request;