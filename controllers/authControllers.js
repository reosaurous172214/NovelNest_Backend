import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/* ================= REGISTER ================= */
export const registerUser = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    // Check existing user
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      username,
      email,
      password: hashed,
      profilePicture: req.file ? `/utilities/${req.file.filename}` : null,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= LOGIN ================= */
export const loginUser = async (req, res) => {
  try {
    console.log("Login request body:", req.body);

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    console.log("Found user:", user);
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not defined!");
      return res.status(500).json({ message: "Server misconfiguration" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user });
  } catch (err) {
    console.error("Login error full:", err);
    res.status(500).json({ message: "Server error during login" });
  }
};

  
/* ================= GET LOGGED-IN USER ================= */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password");

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
      matureContent: req.body.matureContent ?? user.preferences?.matureContent ?? false,
      notifications: req.body.notifications ?? user.preferences?.notifications ?? true,
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
    if (!match) return res.status(400).json({ message: "Current password incorrect" });

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
