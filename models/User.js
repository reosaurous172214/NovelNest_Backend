import mongoose from "mongoose";

/* ================= READING HISTORY ================= */

const readingHistorySchema = new mongoose.Schema(
  {
    novel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Novel",
      required: true,
    },
    lastReadChapter: {
      type: Number,
      default: 1,
    },
    lastReadChapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

/* ================= USER SCHEMA ================= */

const userSchema = new mongoose.Schema(
  {
    /* -------- BASIC PROFILE -------- */
    profilePicture: {
      type: String,
      default: "utilities/dummy.png",
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

    mobile: {
      type: String,
      trim: true,
    },

    bio: {
      type: String,
      default: "",
      maxlength: 300,
    },

    password: {
      type: String,
      required: true,
    },

    /* -------- LOCATION -------- */
    location: {
      country: String,
      state: String,
      city: String,
      timezone: String,
    },

    /* -------- USER PREFERENCES -------- */
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "light",
      },
      language: {
        type: String,
        default: "en",
      },
      matureContent: {
        type: Boolean,
        default: false,
      },
      notifications: {
        type: Boolean,
        default: true,
      },
    },

    /* -------- PRIVACY CONTROLS -------- */
    privacy: {
      showEmail: {
        type: Boolean,
        default: false,
      },
      showMobile: {
        type: Boolean,
        default: false,
      },
      showLocation: {
        type: Boolean,
        default: true,
      },
    },

    /* -------- ROLE & ACCESS -------- */
    role: {
      type: String,
      enum: ["reader", "author", "admin"],
      default: "reader",
    },
    isBanned : {
      type: Boolean,
      default: false,
    },
    /* -------- READING HISTORY -------- */
    history: {
      type: [readingHistorySchema],
      default: [],
    },

    /* -------- USER LIBRARY -------- */
    bookmarks: [
      {
        novel: { type: mongoose.Schema.Types.ObjectId, ref: "Novel" },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    favourites: [
      {
        novel: { type: mongoose.Schema.Types.ObjectId, ref: "Novel" },
        addedAt: { type: Date, default: Date.now },
      },
    ],

    favoriteGenres: [String],

    /* -------- READING STATS -------- */
    readingStats: {
      totalChaptersRead: {
        type: Number,
        default: 0,
      },
      totalNovelsRead: {
        type: Number,
        default: 0,
      },
      lastActiveAt: {
        type: Date,
        default: Date.now,
      },
    },

    /* -------- SUBSCRIPTION -------- */
    subscription: {
      plan: {
        type: String,
        enum: ["free", "premium"],
        default: "free",
      },
      expiresAt: Date,
    },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
