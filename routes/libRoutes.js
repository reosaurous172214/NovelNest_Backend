import {
    getUserHistory,
    // addToUserHistory,
    clearUserHistory,
    removeFromUserHistory,
    getUserFavourites,
    addToUserFavourites,
    removeFromUserFavourites,
    clearUserFavourites,
    getUserBookmarks,
    addToUserBookmarks,
    removeFromUserBookmarks,
    clearUserBookmarks

} from "../controllers/libControllers.js";
import express from "express";
import  protect  from "../middleware/authMiddleware.js";

const router = express.Router();
// User History Routes
router.get("/history", protect, getUserHistory);
// router.post("/history/:novelId/last/:chapterNumber", protect, addToUserHistory);
router.delete("/history", protect, clearUserHistory);
router.delete("/history/:novelId", protect, removeFromUserHistory);
// User Favourites Routes
router.get("/favourites", protect, getUserFavourites);
router.post("/favourites/add/:novelId", protect, addToUserFavourites);
router.delete("/favourites/delete/:novelId", protect, removeFromUserFavourites);
router.delete("/favourites", protect, clearUserFavourites);
// User Bookmarks Routes
router.get("/bookmarks/get", protect, getUserBookmarks);
router.post("/bookmarks/add/:novelId", protect, addToUserBookmarks);
router.delete("/bookmarks/delete/:novelId", protect, removeFromUserBookmarks);
router.delete("/bookmarks/clearall", protect, clearUserBookmarks);
export default router; 