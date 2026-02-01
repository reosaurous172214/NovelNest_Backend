import mongoose from "mongoose";

const novelSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    slug: {type: String, unique: true, lowercase: true, index: true},
    genres: [{ type: String, lowercase: true }],
    tags: [{ type: String, lowercase: true }],

    coverImage: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    isPublished: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["ongoing", "completed"],
      default: "ongoing",
    },

    totalChapters: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    views: { type: Number, default: 0 },

    recommendations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Novel" }],
  },
  { timestamps: true }
);
novelSchema.pre("validate", function (next) {
  if (this.title && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .split(' ')
      .join('-')
      .replace(/[^\w-]+/g, '');
  }
  next();
});

export default mongoose.model("Novel", novelSchema);
