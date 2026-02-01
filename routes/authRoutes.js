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
import authmiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// AUTH
router.post("/register", upload.single("profilePicture"), registerUser);
router.post("/login", loginUser);

// PROFILE
router.get("/me", authmiddleware, getMe);
router.put("/updateProfile", authmiddleware, upload.single("profilePicture"), updateUserProfile);
router.put("/privacy", authmiddleware, updatePrivacy);
router.put("/changePassword", authmiddleware, changePassword);
router.get("/stats", authmiddleware, getReadingStats);

export default router;
