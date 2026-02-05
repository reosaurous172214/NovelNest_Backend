import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import path from "path";
import novelRoutes from "./routes/novelRoutes.js";
import chapterRoutes from "./routes/chapterRoutes.js";
import libRoutes from "./routes/libRoutes.js";
import activityRoutes from "./routes/activity.routes.js";
import { novelSearchTrie } from "./services/search.service.js";
import Novel from "./models/Novel.js";
import searchRoutes from "./routes/search.routes.js";
import commentRoutes from "./routes/comment.router.js";
import notificationRoutes from "./routes/notification.router.js";
import adminRoutes from "./routes/admin.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js"
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/utilities", express.static(path.join(process.cwd(), "utilities")));
app.use("/api/search", searchRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/novels", novelRoutes);
app.use("/api/chapters", chapterRoutes);
app.use("/api/lib", libRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/comments",commentRoutes);
app.use("/api/notifications",notificationRoutes);
app.use('/api/admin',adminRoutes);
app.use('/api/analytics',analyticsRoutes);
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
    // 🔥 CALL IT HERE: Only after connection is successful
    getTitle(); 
  })
  .catch(err => console.error("Mongo error:", err.message));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
