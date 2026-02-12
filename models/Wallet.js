import mongoose from "mongoose";

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true 
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, "Insufficient balance"],
  },
  totalSpent: {
    type: Number,
    default: 0,
  },
  totalEarned: { // Important for Author revenue tracking
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: "NestCoin",
  }
}, { timestamps: true });

export default mongoose.model("Wallet", walletSchema);