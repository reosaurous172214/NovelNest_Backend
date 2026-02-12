import express from "express";
import { 
  createCheckoutSession, 
  stripeWebhook, 
  getWalletBalance, 
  getTransactionHistory 
} from "../controllers/payment.controller.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// 1. Transaction Logic
router.get("/wallet", protect, getWalletBalance);
router.get("/history", protect, getTransactionHistory);

// 2. Stripe Logic
router.post("/create-checkout", protect, createCheckoutSession);
//

// NOTE: The webhook route must be handled in server.js 
// BEFORE express.json() to maintain the raw body for signature verification.
export default router;