import Stripe from "stripe";
import mongoose from "mongoose";
import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";

// Safe Initialization: Prevents crash if .env isn't loaded yet
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is missing from environment variables.");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

/* ================= CREATE CHECKOUT SESSION ================= */
export const createCheckoutSession = async (req, res) => {
  const stripe = getStripe();
  try {
    const { amount, price } = req.body; 

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      // Use _id (Mongoose default) for the reference
      client_reference_id: req.user.id.toString(),
      metadata: {
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
            unit_amount: price*10 , // Cents
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

/* ================= STRIPE WEBHOOK (ATOMIC) ================= */

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
    const coins = parseInt(session.metadata.coinAmount);

    // ACID Transaction for money integrity
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      // 1. Idempotency Check
      const existingTx = await Transaction.findOne({ stripeSessionId: session.id }).session(dbSession);
      if (existingTx) {
        await dbSession.abortTransaction();
        return res.status(200).json({ received: true });
      }

      // 2. Atomic Update
      const wallet = await Wallet.findOneAndUpdate(
        { user: userId },
        { $inc: { balance: coins } },
        { new: true, session: dbSession ,
          upsert: true, // This creates the wallet if it doesn't exist!
    setDefaultsOnInsert: true
        }
      );

      // 3. Create Audit Trail
      await Transaction.create([{
        wallet: wallet._id,
        user: userId,
        amount: coins,
        type: 'deposit',
        status: 'completed',
        stripeSessionId: session.id,
        balanceAfter: wallet.balance,
        description: `Bought ${coins} NestCoins via Stripe`
      }], { session: dbSession });

      await dbSession.commitTransaction();
    } catch (error) {
      await dbSession.abortTransaction();
      console.error("Critical Webhook Error:", error.message);
    } finally {
      dbSession.endSession();
    }
  }
  res.json({ received: true });
};

/* ================= WALLET & HISTORY ================= */


export const getWalletBalance = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });
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