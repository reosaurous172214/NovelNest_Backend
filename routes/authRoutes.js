import express from "express";
import passport from "passport"; // Import passport
import {
  registerUser,
  loginUser,
  getMe,
  updateUserProfile,
  updatePrivacy,
  changePassword,
  getReadingStats,
  walletConnect,
  sendOTP,
  resetPassword,
  googleAuth,        // Add this
  googleAuthCallback // Add this
} from "../controllers/authControllers.js";

import { upload } from "../middleware/upload.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================= GOOGLE AUTH ================= */

// Initial hit: /api/auth/google
router.get("/google", googleAuth);

// Google returns here: /api/auth/google/callback
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  googleAuthCallback
);

/* ================= BASIC AUTH ================= */
router.post("/register", upload.single("profilePicture"), registerUser);
router.post("/login", loginUser);
router.post('/send-otp', sendOTP);
router.post('/reset-pass', resetPassword);

/* ================= PROFILE ================= */
router.get("/me", protect, getMe);
router.put("/updateProfile", protect, upload.single("profilePicture"), updateUserProfile);
router.put("/privacy", protect, updatePrivacy);
router.put("/changePassword", protect, changePassword);
router.get("/stats", protect, getReadingStats);

// WALLET
router.put("/update-wallet", protect, walletConnect);

export default router;