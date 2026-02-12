import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import session from "express-session"; // ADD THIS
import passport from "passport"; // ADD THIS
import "./config/passport.js"; // ADD THIS (Ensures strategy is loaded)

// Routes
import authRoutes from "./routes/authRoutes.js";
import novelRoutes from "./routes/novelRoutes.js";
import chapterRoutes from "./routes/chapterRoutes.js";
import libRoutes from "./routes/libRoutes.js";
import activityRoutes from "./routes/activity.routes.js";
import searchRoutes from "./routes/search.routes.js";
import commentRoutes from "./routes/comment.router.js";
import notificationRoutes from "./routes/notification.router.js";
import adminRoutes from "./routes/admin.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import payments from './routes/payment.routes.js';
import requestRoutes from "./routes/request.routers.js";
// Services/Models
import { novelSearchTrie } from "./services/search.service.js";
import Novel from "./models/Novel.js";
import { startBlockchainListener } from "./blockchain/listener.js";
import { stripeWebhook } from './controllers/payment.controller.js';

dotenv.config();
const app = express();

// Stripe Webhook (Must be before express.json())
app.post(
  "/api/payments/webhook", 
  express.raw({ type: "application/json" }), 
  stripeWebhook
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= PASSPORT & SESSION ================= */
// Required for the temporary handshake during Google OAuth
app.use(
  session({
    secret: process.env.SESSION_SECRET || "novelhub_secret_key", 
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());
/* ====================================================== */

app.use("/utilities", express.static(path.join(process.cwd(), "utilities")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/novels", novelRoutes);
app.use("/api/chapters", chapterRoutes);
app.use("/api/lib", libRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', payments);
app.use('/api/requests', requestRoutes);
app.get("/", (req, res) => {
  res.send("Novel API is running");
});

const getTitle = async () => {
    const novels = await Novel.find({}, "title _id coverImage");
    novels.forEach(n => {
        novelSearchTrie.insert(n.title, { id: n._id, title: n.title, cover: n.coverImage });
    });
    console.log("🚀 Search Trie Indexed");
};

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    startBlockchainListener();
    getTitle(); 
  })
  .catch(err => console.error("Mongo error:", err.message));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});