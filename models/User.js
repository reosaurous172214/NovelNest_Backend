import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    profilePicture: {
      type: String,
      default: "utilities/profile.png",
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    bio: {
      type: String,
      default: "",
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["reader", "author", "admin"],
      default: "reader",
    },
    bookmarks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Novel",
      },
    ],
    history: [
      {
        novel: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Novel",
        },
        lastReadChapter: {
          type: Number,
          default: 1,
        },
        chapter: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Chapter",
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    favourites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Novel",
      },
    ],
    favoriteGenres: [
      {
        type: String,
      },
    ],
  },

  { timestamps: true },
);

export default mongoose.model("User", userSchema);
