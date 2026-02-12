import express from "express";
import { 
  getMyNotifications, 
  markAsRead, 
  deleteNotification ,
  clearAllNotifications
} from "../controllers/notification.controller.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();
// All notification routes require being logged in
router.get("/",protect, getMyNotifications);

router.patch('/read/:id',protect, markAsRead);     // For "Mark all"
router.patch('/read',protect, markAsRead); // For single notification
// router.patch("/read",protect,markAsReadAll);
router.delete("/clear-all",protect, clearAllNotifications);//clear all
router.delete("/:id",protect, deleteNotification);


export default router;