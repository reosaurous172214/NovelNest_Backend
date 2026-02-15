import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Wallet",
    required: false,
    index: true
  },
  user: { // Redundant but helpful for quick queries without populating wallet
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  amount: {
    type: Number, // + for deposits, - for spending
    required: true
  },
  type: {
    type: String,
    enum: ["deposit", "purchase", "payout", "bonus","withdrawal", "subscription"],
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending"
  },
  stripeSessionId: {
    type: String,
    unique: true, // Crucial: Prevents processing the same Stripe payment twice
    sparse: true 
  },
  description: String, // e.g., "Purchase: 500 NestCoins" or "Unlocked Chapter 10"
  balanceAfter: Number, // The balance snapshot AFTER this transaction
}, { timestamps: true });

// Compound index for fast history sorting
transactionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Transaction", transactionSchema);