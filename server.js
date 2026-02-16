import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import helmet from "helmet";
import session from "express-session";
import passport from "passport";
import "./config/passport.js";

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
import payments from "./routes/payment.routes.js";
import requestRoutes from "./routes/request.routers.js";

// Services/Models
import { novelSearchTrie } from "./services/search.service.js";
import Novel from "./models/Novel.js";
import User from "./models/User.js"; // Needed for index cleanup
import { startBlockchainListener } from "./blockchain/listener.js";
import { stripeWebhook } from "./controllers/payment.controller.js";
import errorHandler from "./middleware/errorMiddleware.js";

dotenv.config();
const app = express();

// Required for Render/Vercel to handle secure cookies correctly
app.set("trust proxy", 1);

/* ================= PRE-MIDDLEWARE ================= */

// 1. Stripe Webhook (MUST be before express.json() for raw body verification)
app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

// 2. Security & Headers
app.use(helmet({
  crossOriginResourcePolicy: false, 
}));

// 3. CORS Configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.CLIENT_URL, 
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// 4. Standard Body Parsers (placed after Webhook)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= PASSPORT & SESSION ================= */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "novelhub_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    }
  }),
);

app.use(passport.initialize());
app.use(passport.session());

/* ================= STATIC FILES ================= */
app.use("/utilities", express.static(path.join(process.cwd(), "utilities")));

/* ================= API ROUTES ================= */
app.use("/api/auth", authRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/novels", novelRoutes);
app.use("/api/chapters", chapterRoutes);
app.use("/api/lib", libRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/payments", payments);
app.use("/api/requests", requestRoutes);

// Health Check
app.get("/", (req, res) => {
  res.status(200).json({ status: "Neural Hub Online", timestamp: new Date() });
});

/* ================= ERROR HANDLING ================= */
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

app.use(errorHandler);

/* ================= INITIALIZATION LOGIC ================= */

const getTitle = async () => {
  try {
    const novels = await Novel.find({}, "title _id coverImage");
    novels.forEach((n) => {
      novelSearchTrie.insert(n.title, {
        id: n._id,
        title: n.title,
        cover: n.coverImage,
      });
    });
    console.log("🚀 Search Trie Indexed");
  } catch (err) {
    console.error("Trie Indexing Failed:", err.message);
  }
};

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4, 
    });
    
    console.log("MongoDB connected 🚀");

    // CRITICAL: Drop problematic wallet index that crashes OTP/Registration
    
    
    // Background Services
    startBlockchainListener();
    getTitle(); 

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("Database Connection failed:", err.message);
    setTimeout(connectDB, 5000);
  }
};

connectDB();