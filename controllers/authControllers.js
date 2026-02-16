import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";
import OTP from "../models/OTP.js";
import passport from "passport";

/* ================= GOOGLE AUTHENTICATION ================= */

export const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});

export const googleAuthCallback = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
    }

    if (user.isBanned) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=restricted`);
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.redirect(`${process.env.CLIENT_URL}/auth-success?token=${token}`);
  } catch (error) {
    console.error("Google Callback Error:", error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
  }
};

/* ================= REGISTER ================= */
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, otpCode } = req.body;

    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord || otpRecord.code !== otpCode || new Date() > otpRecord.expiresAt) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const profilePicture = req.file ? `/utilities/${req.file.filename}` : "/utilities/dummy.png";
    const hashed = await bcrypt.hash(password, 10);
    
    const user = await User.create({
      username,
      email,
      password: hashed,
      profilePicture,
    });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    
    await OTP.deleteOne({ email });

    res.status(201).json({
      success: true,
      message: "Account verified and created!",
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      return res.status(400).json({ message: "User is restricted from login!" });

    if (!user.password) {
      return res.status(400).json({ message: "Please use 'Continue with Google' for this account." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: error.message || "Server error during login" });
  }
};

/* ================= GET LOGGED-IN USER ================= */
export const getMe = async (req, res) => {
  try {
    // Use _id to be safe with MongoDB
    const user = await User.findById(req.user._id || req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    
    if (user.isBanned)
      return res.status(400).json({ message: "User is restricted from login!" });
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch profile" });
  }
};

/* ================= UPDATE PROFILE ================= */
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    if (user.isBanned)
      return res.status(400).json({ message: "User is restricted from login!" });

    user.username = req.body.username ?? user.username;
    user.bio = req.body.bio ?? user.bio;
    user.mobile = req.body.mobile ?? user.mobile;

    user.location = {
      country: req.body.country ?? user.location?.country,
      state: req.body.state ?? user.location?.state,
      city: req.body.city ?? user.location?.city,
      timezone: req.body.timezone ?? user.location?.timezone,
    };

    user.preferences = {
      theme: req.body.theme ?? user.preferences?.theme ?? "light",
      language: req.body.language ?? user.preferences?.language ?? "en",
      matureContent: req.body.matureContent ?? user.preferences?.matureContent ?? false,
      notifications: req.body.notifications ?? user.preferences?.notifications ?? true,
    };

    if (req.file) user.profilePicture = `/utilities/${req.file.filename}`;

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message || "Profile update failed" });
  }
};

/* ================= CHANGE PASSWORD ================= */
export const changePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { currentPassword, newPassword } = req.body;
    
    if (!user.password) {
      return res.status(400).json({ message: "Google accounts do not have a password." });
    }

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: "Current password incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Password change failed" });
  }
};

/* ================= OTP LOGIC ================= */
export const sendOTP = async (req, res) => {
  const { email, type } = req.body;
  const otpCode = crypto.randomInt(100000, 999999).toString();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  try {
    if (type === "reset") {
      const existingUser = await User.findOne({ email });
      if (!existingUser) return res.status(404).json({ message: "No account found." });
    }

    await OTP.findOneAndUpdate(
      { email },
      { code: otpCode, expiresAt: otpExpiresAt },
      { upsert: true, new: true }
    );

    await sendEmail({
      email,
      subject: "NovelHub Verification Code",
      html: `<h3>Your code is: ${otpCode}</h3><p>Valid for 10 minutes.</p>`,
    });

    res.status(200).json({ success: true, message: "OTP sent!" });
  } catch (error) {
    console.error("OTP Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  const { email, otpCode, newPassword } = req.body;
  try {
    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord || otpRecord.code !== otpCode || new Date() > otpRecord.expiresAt) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    await OTP.deleteOne({ email });

    res.status(200).json({ success: true, message: "Password reset successful!" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Reset failed" });
  }
};

/* ================= OTHERS ================= */
export const updatePrivacy = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.privacy = {
      showEmail: req.body.showEmail ?? user.privacy?.showEmail ?? false,
      showMobile: req.body.showMobile ?? user.privacy?.showMobile ?? false,
      showLocation: req.body.showLocation ?? user.privacy?.showLocation ?? true,
    };

    await user.save();
    res.json(user.privacy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getReadingStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.readingStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const walletConnect = async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id || req.user.id,
      { walletAddress: walletAddress.toLowerCase() },
      { new: true }
    );
    res.status(200).json({ success: true, walletAddress: user.walletAddress });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};