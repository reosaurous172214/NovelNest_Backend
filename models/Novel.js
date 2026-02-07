import mongoose from "mongoose";

const novelSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
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
    ratings: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      rating: {
        type: Number,
        required: true
      }
    }
    ],
    views: { type: Number, default: 0 },

    recommendations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Novel" }],
    favoritedBy :[
      {
        type : mongoose.Schema.Types.ObjectId, ref : "User"
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("Novel", novelSchema);
