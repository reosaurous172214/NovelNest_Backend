import express from "express";
import {
  postComment,
  getNovelComments,
  getUserComments,
  deleteComment,
  voteComment,
  postReply,
  updateComment,
} from "../controllers/comment.controller.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();
router.post("/", protect, postComment);

// router.get("/:userId", getUserComments);

router.get("/:novelId", getNovelComments);



router.post("/:id/replies", protect, postReply);

router.put("/:id", protect, updateComment);

router.patch("/:id/vote", protect, voteComment);

router.delete("/:id", protect, deleteComment);

export default router;
