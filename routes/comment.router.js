import express from "express";
import { 
    postComment, 
    getNovelComments, 
    deleteComment, 
    voteComment, 
    postReply 
} from "../controllers/comment.controller.js";
import protect  from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:novelId", getNovelComments);

router.post("/", protect, postComment);

router.post("/:id/replies", protect, postReply);

router.patch("/:id/vote", protect, voteComment);

router.delete("/:id", protect, deleteComment);

export default router;