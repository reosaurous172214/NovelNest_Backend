import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";

dotenv.config();

const migrate = async () => {
  try {
    // 1. Establish Connection
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected.");

    // 2. Identification: Find users who do NOT have a wallet field
    // We use the $exists: false query to find only those who need migration
    const usersToMigrate = await User.find({ wallet: { $exists: false } });
    
    if (usersToMigrate.length === 0) {
      console.log("ℹ️ No users require migration. System is up to date.");
      process.exit(0);
    }

    console.log(`🚀 Starting migration for ${usersToMigrate.length} users...`);

    for (const user of usersToMigrate) {
      // 3. Create the Wallet Document
      // We use a separate model to keep the User object lightweight
      const newWallet = await Wallet.create({
        user: user._id,
        balance: 0, // Initializing with 0; adjust if you have old balance data
        totalSpent: 0,
        totalEarned: 0
      });

      // 4. Atomic Update: Link the Wallet ID to the User
      // We use findByIdAndUpdate with $set to bypass validation issues 
      // often found with .save() in existing data.
      await User.findByIdAndUpdate(user._id, { 
        $set: { wallet: newWallet._id } 
      });

      console.log(`✅ Migrated: ${user.username} (${user._id})`);
    }

    console.log("🏁 Migration successfully completed.");
    process.exit(0);

  } catch (error) {
    console.error("❌ Migration Error:", error);
    process.exit(1);
  }
};

// Execute
migrate();