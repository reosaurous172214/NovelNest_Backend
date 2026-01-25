import express from "express";
import {registerUser, loginUser , updateUserProfile} from "../controllers/authControllers.js";
import {upload} from "../middleware/upload.js";
import authmiddleware from "../middleware/authMiddleware.js";
const router = express.Router();

// Register
router.post("/register", upload.single("profilePicture"), registerUser);
// Login
router.post("/login", loginUser);
//Update User Profile
router.put("/updateProfile",authmiddleware,upload.single("profilePicture"), updateUserProfile);


export default router;
