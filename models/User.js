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
    googleId: {
      type: String,
      unique: true,
      sparse: true,
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
    otp: {
      code: { type: String },
      expiresAt: { type: Date },
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
        // Updated to match your frontend options
        enum: ["light", "dark", "system", "default", "cyberpunk", "emerald"],
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
    isBanned: {
      type: Boolean,
      default: false,
    },

    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      index: true,
      unique: true,
      sparse:true,
    },

    /* -------- OWNED CONTENT -------- */
    unlockedChapters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chapter",
      },
    ],
    unlockedNovels: [
      { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Novel" ,
      },
    ],
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

    /* -------- UPDATED SUBSCRIPTION LOGIC -------- */
    subscription: {
      plan: {
        type: String,
        enum: ["free", "monthly", "quarterly", "half-yearly", "yearly"],
        default: "free",
      },
      status: {
        type: String,
        enum: ["active", "expired", "cancelled"],
        default: "active",
      },
      startDate: Date,
      expiresAt: Date,
      stripeCustomerId: String, // Good to have for managing refunds/billing later
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // Ensure virtuals are included when sending to frontend
    toObject: { virtuals: true },
  },
);

/* ================= VIRTUALS ================= */

// This checks if the user is currently premium based on date
userSchema.virtual("isPremium").get(function () {
  if (this.subscription.plan === "free") return false;
  if (!this.subscription.expiresAt) return false;
  return this.subscription.expiresAt > Date.now();
});

export default mongoose.model("User", userSchema);
