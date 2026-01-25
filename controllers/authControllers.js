import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
export const registerUser = async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
        const existingUser = await
            User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        // save profile picture by date and time to avoid overwriting
        const profilePicture = req.file? `/utilities/${req.file.filename}` : null;
        const newUser = new User({
            profilePicture,
            username,
            email,
            password: hashedPassword,
            role
        });
        await newUser.save();
        const token = jwt.sign(
            { id: newUser._id, username: newUser.username, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        res.status(200).json({
      token,
    });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: `http://localhost:5000${user.profilePicture}`,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


export const updateUserProfile = async (req, res) => {
  const { username, bio, favoriteGenre, password } = req.body;
  
  try {
    // 1. Find user by ID (from your auth middleware)
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Handle Profile Picture Logic
    // Only update if a new file was actually uploaded
    if (req.file) {
      user.profilePicture = `/utilities/${req.file.filename}`;
    }

    // 3. Update Text Fields (Only if provided)
    if (username) user.username = username;
    if (bio !== undefined) user.bio = bio;
    if (favoriteGenre) user.favoriteGenres = favoriteGenre;

    // 4. Handle Password Security
    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(12);
      user.password = await bcrypt.hash(password, salt);
    }

    // 5. Persist to Database
    const updatedUser = await user.save();

    // 6. Return Clean Object
    // Remove password from response for security
    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    res.status(200).json({ 
      message: "Profile synchronized successfully", 
      user: userResponse 
    });

  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ message: "Failed to synchronize personnel records" });
  }
};