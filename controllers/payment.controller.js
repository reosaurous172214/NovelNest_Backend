import Stripe from "stripe";
import mongoose from "mongoose";
import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is missing from environment variables.");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

// Centralized Pricing Registry
const planPrices = {
  monthly: 499,      // $4.99
  quarterly: 1299,   // $12.99
  "half-yearly": 2499, 
  yearly: 3999,      
};

/* ================= 1. CREATE COIN SESSION ================= */
export const createCheckoutSession = async (req, res) => {
  const stripe = getStripe();
  try {
    const { amount, price } = req.body; 

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      client_reference_id: req.user.id.toString(),
      metadata: {
        type: "coin_purchase", 
        coinAmount: amount, 
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: `${amount} NestCoins`,
              description: "Digital currency for NovelNest stories" 
            },
            unit_amount: price * 100, // Dollars to Cents
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= 2. CREATE SUBSCRIPTION SESSION ================= */
export const createSubscriptionSession = async (req, res) => {
  const stripe = getStripe();
  try {
    const { plan } = req.body;
    const priceInCents = planPrices[plan];

    if (!priceInCents) {
      return res.status(400).json({ error: "Invalid plan selected." });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment", 
      client_reference_id: req.user.id.toString(),
      metadata: {
        type: "subscription_upgrade",
        planId: plan,
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${plan.toUpperCase()} Premium Membership`,
              description: "Unlocks 60% discount on all purchases and ad-free reading.",
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/subscription`,
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= 3. UNIFIED STRIPE WEBHOOK (UPDATED) ================= */

export const stripeWebhook = async (req, res) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    const { type, coinAmount, planId } = session.metadata;

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      const existingTx = await Transaction.findOne({ stripeSessionId: session.id }).session(dbSession);
      if (existingTx) {
        await dbSession.abortTransaction();
        return res.status(200).json({ received: true });
      }

      if (type === "subscription_upgrade") {
        let expiryDate = new Date();
        let updateData = {
          "subscription.plan": planId,
          "subscription.status": "active",
          "subscription.startDate": new Date(),
          "subscription.stripeCustomerId": session.customer
        };

        // Date Calculation Logic
        if (planId === "monthly") expiryDate.setDate(expiryDate.getDate() + 30);
        else if (planId === "quarterly") expiryDate.setDate(expiryDate.getDate() + 90);
        else if (planId === "half-yearly") expiryDate.setDate(expiryDate.getDate() + 182);
        else if (planId === "yearly") {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);

          // --- BONUS NOVELS LOGIC FOR ANNUAL PLAN ---
          // Select two popular novels that the user hasn't already unlocked
          const userObj = await User.findById(userId).session(dbSession);
          const alreadyUnlocked = userObj.unlockedNovels || [];

          // Query for 2 novels not in the user's current list
          const bonusNovels = await mongoose.model("Novel").find({
            _id: { $nin: alreadyUnlocked }
          })
          .sort({ views: -1 }) // Sort by popularity
          .limit(2)
          .session(dbSession);

          if (bonusNovels.length > 0) {
            const bonusIds = bonusNovels.map(n => n._id);
            // We use $addToSet to prevent duplicates just in case
            updateData.$addToSet = { unlockedNovels: { $each: bonusIds } };
          }
        }

        updateData["subscription.expiresAt"] = expiryDate;

        // Update User Model with subscription and bonus novels
        await User.findByIdAndUpdate(userId, updateData, { session: dbSession });

        // Audit Trail
        await Transaction.create([{
          user: userId,
          amount: session.amount_total / 100,
          type: 'subscription',
          status: 'completed',
          stripeSessionId: session.id,
          description: `Upgraded to ${planId} Premium ${planId === 'yearly' ? '(Includes 2 Bonus Novels)' : ''} (Expires: ${expiryDate.toDateString()})`
        }], { session: dbSession });

      } else if (type === "coin_purchase") {
        // ... (Existing Coin Purchase Logic)
        const coins = parseInt(coinAmount);
        const wallet = await Wallet.findOneAndUpdate(
          { user: userId },
          { $inc: { balance: coins } },
          { new: true, session: dbSession, upsert: true, setDefaultsOnInsert: true }
        );

        await Transaction.create([{
          wallet: wallet._id,
          user: userId,
          amount: coins,
          type: 'deposit',
          status: 'completed',
          stripeSessionId: session.id,
          balanceAfter: wallet.balance,
          description: `Bought ${coins} NestCoins`
        }], { session: dbSession });
      }

      await dbSession.commitTransaction();
    } catch (error) {
      await dbSession.abortTransaction();
      console.error("Critical Payment Processing Error:", error.message);
    } finally {
      dbSession.endSession();
    }
  }
  res.json({ received: true });
};

/* ================= 4. GETTERS ================= */
export const getWalletBalance = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) return res.status(404).json({ message: "No active wallet found." });
    res.status(200).json(wallet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTransactionHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};