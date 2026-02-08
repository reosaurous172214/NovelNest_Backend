import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";
import OTP from "../models/OTP.js";
/* ================= REGISTER ================= */
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, otpCode } = req.body;

    // 1. Check if the user/email exists in the DB (from the Send OTP step)
    const otpRecord = await OTP.findOne({ email });
        if (!otpRecord || otpRecord.code !== otpCode || new Date() > otpRecord.expiresAt) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

    // 4. Everything is valid -> Complete the profile
    const profilePicture = req.file ? `/utilities/${req.file.filename}` : "/utilities/dummy.png";
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
          username,
          email,
          password:hashed,
          profilePicture
    });

    // 6. Generate JWT for immediate login
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    await OTP.deleteOne({ email });

    res.status(201).json({ 
        success: true, 
        message: "Account verified and created!", 
        token, 
        user: { id: user._id, username: user.username, email: user.email } 
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= LOGIN ================= */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });
    if (user.isBanned)
      return res
        .status(400)
        .json({ message: "User is restricted from login!" });

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not defined!");
      return res.status(500).json({ message: "Server Error" });
    }

    const token = jwt.sign({ id: user._id ,role : user.role}, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token, user });
  } catch (err) {
    console.error("Login error full:", err);
    res.status(500).json({ message: "Server error during login" });
  }
};

/* ================= GET LOGGED-IN USER ================= */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (user.isBanned)
      return res
        .status(400)
        .json({ message: "User is restricted from login!" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

/* ================= UPDATE PROFILE ================= */
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isBanned)
      return res
        .status(400)
        .json({ message: "User is restricted from login!" });
    // BASIC INFO
    user.username = req.body.username ?? user.username;
    user.bio = req.body.bio ?? user.bio;
    user.mobile = req.body.mobile ?? user.mobile;

    // LOCATION
    user.location = {
      country: req.body.country ?? user.location?.country,
      state: req.body.state ?? user.location?.state,
      city: req.body.city ?? user.location?.city,
      timezone: req.body.timezone ?? user.location?.timezone,
    };

    // PREFERENCES
    user.preferences = {
      theme: req.body.theme ?? user.preferences?.theme ?? "light",
      language: req.body.language ?? user.preferences?.language ?? "en",
      matureContent:
        req.body.matureContent ?? user.preferences?.matureContent ?? false,
      notifications:
        req.body.notifications ?? user.preferences?.notifications ?? true,
    };

    // PROFILE PICTURE
    if (req.file) user.profilePicture = `/utilities/${req.file.filename}`;

    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Profile update failed" });
  }
};

/* ================= UPDATE PRIVACY ================= */
export const updatePrivacy = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.privacy = {
      showEmail: req.body.showEmail ?? user.privacy?.showEmail ?? false,
      showMobile: req.body.showMobile ?? user.privacy?.showMobile ?? false,
      showLocation: req.body.showLocation ?? user.privacy?.showLocation ?? true,
    };

    await user.save();
    res.json(user.privacy);
  } catch (err) {
    res.status(500).json({ message: "Privacy update failed" });
  }
};
/* ================= CHANGE PASSWORD ================= */
export const changePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { currentPassword, newPassword } = req.body;

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match)
      return res.status(400).json({ message: "Current password incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;

    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Password change failed" });
  }
};

/* ================= READING STATS ================= */
export const getReadingStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.readingStats);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch reading stats" });
  }
};
export const walletConnect = async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    // Update the user who is currently logged in
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { walletAddress: walletAddress.toLowerCase() },
      { new: true }
    );

    res.status(200).json({ success: true, walletAddress: user.walletAddress });
  } catch (error) {
    res.status(500).json({ message: "Failed to update wallet", error: error.message });
  }
};
// Send OTP

// 1. Send OTP for Registration or Forgot Password
export const sendOTP = async (req, res) => {
    // FIXED: Destructured 'type'
    const { email, type } = req.body; 
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    try {
        if (type === 'reset') {
            const existingUser = await User.findOne({ email });
            if (!existingUser) return res.status(404).json({ message: "No account found." });
        }

        // FIXED: Used correct field names matching your OTP model
        await OTP.findOneAndUpdate(
            { email },
            { code: otpCode, expiresAt: otpExpiresAt },
            { upsert: true, new: true }
        );

        await sendEmail({
            email,
            subject: 'NovelHub Verification Code',
            html: `<h3>Your code is: ${otpCode}</h3><p>Valid for 10 minutes.</p>`
        });

        res.status(200).json({ success: true, message: "OTP sent!" });
    } catch (error) {
        res.status(500).json({ message: "Error sending OTP" });
    }
};
// 2. Forgot Password - Reset logic after OTP is verified
export const resetPassword = async (req, res) => {
    const { email, otpCode, newPassword } = req.body;

    try {
        // 1. Check the OTP model, not the User model for the code
        const otpRecord = await OTP.findOne({ email });

        if (!otpRecord || otpRecord.code !== otpCode || new Date() > otpRecord.expiresAt) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        await user.save();
        await OTP.deleteOne({ email }); // Clear the OTP record

        res.status(200).json({ success: true, message: "Password reset successful!" });
    } catch (error) {
        res.status(500).json({ message: "Reset failed" });
    }
};