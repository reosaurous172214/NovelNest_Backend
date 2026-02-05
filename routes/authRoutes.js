import express from "express";
import {
  registerUser,
  loginUser,
  getMe,
  updateUserProfile,
  updatePrivacy,
  changePassword,
  getReadingStats
} from "../controllers/authControllers.js";

import { upload } from "../middleware/upload.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// AUTH
router.post("/register", upload.single("profilePicture"), registerUser);
router.post("/login", loginUser);

// PROFILE
router.get("/me", protect, getMe);
router.put("/updateProfile", protect, upload.single("profilePicture"), updateUserProfile);
router.put("/privacy", protect, updatePrivacy);
router.put("/changePassword", protect, changePassword);
router.get("/stats", protect, getReadingStats);

export default router;
