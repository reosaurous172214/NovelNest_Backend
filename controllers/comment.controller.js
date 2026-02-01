import Comment from "../models/Comment.js";
import Novel from "../models/Novel.js";
import { createActivity } from "./activity.controller.js";

/* ---------------- POST A COMMENT ---------------- */
/* ---------------- POST A COMMENT ---------------- */
export const postComment = async (req, res) => {
    try {
        const { novelId, content } = req.body;

        if (!content || !novelId) {
            return res.status(400).json({ message: "Content and Novel ID are required" });
        }

        const comment = await Comment.create({
            novelId,
            userId: req.user.id,
            content
        });

        // 1. FIXED: Must await the population
        const populatedComment = await comment.populate("userId", "username profilePicture");

        // 2. FIXED: Await createActivity so errors don't crash the request
        try {
            await createActivity({
                userId: req.user.id,
                actionType: "WRITE_COMMENT",
                targetType: "Novel",
                targetId: novelId,
                meta: { commentId: comment._id }
            });
        } catch (activityError) {
            console.error("Activity logging failed:", activityError);
            // We don't return res.status(500) here because the comment WAS posted successfully
        }

        res.status(201).json(populatedComment);
    } catch (error) {
        console.error("Post Comment Error:", error);
        res.status(500).json({ message: error.message });
    }
};

/* ---------------- POST A REPLY ---------------- */
/* ---------------- POST A REPLY ---------------- */
export const postReply = async (req, res) => {
    try {
        const { id } = req.params; // The ID of the parent comment
        const { content, novelId } = req.body; // Ensure novelId is sent from frontend

        // 1. Validation check
        if (!content || !novelId) {
            return res.status(400).json({ message: "Content and Novel ID are required to reply." });
        }

        // 2. Create the reply document
        const reply = await Comment.create({
            novelId,
            userId: req.user.id,
            content,
            isReply: true 
        });

        // 3. Link reply to parent and check if parent exists
        const parentComment = await Comment.findByIdAndUpdate(
            id, 
            { $push: { replies: reply._id } },
            { new: true }
        );

        if (!parentComment) {
            // Cleanup: delete the orphaned reply if the parent doesn't exist
            await Comment.findByIdAndDelete(reply._id);
            return res.status(404).json({ message: "The comment you are replying to no longer exists." });
        }

        const populatedReply = await reply.populate("userId", "username profilePicture");

        // 4. Log Activity (Awaited to prevent unhandled promise errors)
        try {
            await createActivity({
                userId: req.user.id,
                actionType: "REPLY_COMMENT",
                targetType: "Novel",
                targetId: novelId,
                meta: { commentId: reply._id, parentId: id }
            });
        } catch (actErr) {
            console.error("Activity log error:", actErr);
        }

        res.status(201).json(populatedReply);
    } catch (error) {
        console.error("Reply Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// --- VOTE ON A COMMENT (Like/Dislike) ---
export const voteComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { voteType } = req.body; // 'like' or 'dislike'

        const update = voteType === 'like' 
            ? { $inc: { likes: 1 } } 
            : { $inc: { dislikes: 1 } };

        const updatedComment = await Comment.findByIdAndUpdate(id, update, { new: true })
            .populate("userId", "username profilePicture");

        res.status(200).json(updatedComment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- GET COMMENTS (With Deep Population) ---
export const getNovelComments = async (req, res) => {
    try {
        const { novelId } = req.params;
        
        // We use deep population to get user info for both comments and their replies
        const comments = await Comment.find({ novelId, isReply: { $ne: true } })
            .populate("userId", "username profilePicture")
            .populate({
                path: 'replies',
                populate: { path: 'userId', select: 'username profilePicture' }
            })
            .sort({ createdAt: -1 });

        res.status(200).json(comments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* ---------------- DELETE A COMMENT ---------------- */
export const deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        // Check if the person deleting is the owner of the comment
        if (comment.userId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: "Unauthorized to delete this comment" });
        }

        await comment.deleteOne();
        res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};