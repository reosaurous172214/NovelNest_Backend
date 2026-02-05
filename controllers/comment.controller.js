import Comment from "../models/Comment.js";
import Novel from "../models/Novel.js";
import { logActivity } from "../services/activity.service.js";
import { logNotification } from "../services/notification.service.js";

/* ---------------- POST A COMMENT ---------------- */
/* ---------------- POST A COMMENT ---------------- */
export const postComment = async (req, res) => {
  try {
    const { novelId, content } = req.body;

    if (!content || !novelId) {
      return res
        .status(400)
        .json({ message: "Content and Novel ID are required" });
    }

    const comment = await Comment.create({
      novelId,
      userId: req.user.id,
      content,
    });

    // 1. FIXED: Must await the population
    const populatedComment = await comment.populate(
      "userId",
      "username profilePicture",
    );

    // 2. FIXED: Await createActivity so errors don't crash the request

    await logActivity({
      userId: req.user.id,
      actionType: "WRITE_COMMENT",
      targetType: "NOVEL",
      targetId: novelId,
      meta: { commentId: comment._id },
    });

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
      return res
        .status(400)
        .json({ message: "Content and Novel ID are required to reply." });
    }

    // 2. Create the reply document
    const reply = await Comment.create({
      novelId,
      userId: req.user.id,
      content,
      isReply: true,
    });

    // 3. Link reply to parent and check if parent exists
    const parentComment = await Comment.findByIdAndUpdate(
      id,
      { $push: { replies: reply._id } },
      { new: true },
    );

    if (!parentComment) {
      // Cleanup: delete the orphaned reply if the parent doesn't exist
      await Comment.findByIdAndDelete(reply._id);
      return res
        .status(404)
        .json({ message: "The comment you are replying to no longer exists." });
    }

    const populatedReply = await reply.populate(
      "userId",
      "username profilePicture",
    );
    const parentId = parentComment.userId;
    // 4. Log Activity (Awaited to prevent unhandled promise errors)

    await logActivity({
      userId: req.user.id,
      actionType: "REPLY_COMMENT",
      targetType: "NOVEL",
      targetId: novelId,
      meta: { commentId: reply._id, parentId: id },
    });
    await logNotification({
      recipient: parentId,
      sender: req.user.id,
      type: "REPLY",
      novelId: novelId,
      commentId: reply._id,
    });

    res.status(201).json(populatedReply);
  } catch (error) {
    console.error("Reply Error:", error);
    res.status(500).json({ message: error.message });
  }
};
// ---Update a comment(On Edit) ---
export const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { novelId, content } = req.body;

    // 1. Validation check
    if (!content) {
      return res
        .status(400)
        .json({ message: "Content is required to Update." });
    }

    // 2. Find and check ownership before updating
    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Security check: Only the owner can edit
    if (comment.userId.toString() !== req.user.id.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized to edit this comment" });
    }

    // 3. Perform Update
    // Use { content } as the second argument, and { new: true } to get the updated doc
    const updatedComment = await Comment.findByIdAndUpdate(
      id,
      { content },
      { new: true },
    ).populate("userId", "username profilePicture");

    // 4. Log Activity for Editing (Optional but recommended)
    await logActivity({
      userId: req.user.id,
      actionType: "EDIT_COMMENT",
      targetType: "NOVEL",
      targetId: novelId || comment.novelId, // Fallback to comment's own novelId
      meta: { commentId: id },
    });

    res.status(200).json(updatedComment);
  } catch (e) {
    console.error("Update Error:", e);
    // Fixed: .json() instead of .sjon()
    res.status(500).json({ message: e.message });
  }
};
// --- VOTE ON A COMMENT (Like/Dislike) ---

export const voteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { voteType } = req.body; // 'like' or 'dislike'
    const voterId = req.user.id;

    // 1. Find the comment first to check existing votes
    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // 2. Logic to prevent multiple likes from the same user
    // Assumes your Schema has a 'likedBy' array of UserIDs
    const hasLiked = comment.likedBy?.includes(voterId);

    if (voteType === "like") {
      if (hasLiked) {
        // If they already liked it, clicking again should "Unlike" (Optional UX)
        await Comment.findByIdAndUpdate(id, {
          $pull: { likedBy: voterId },
          $inc: { likes: -1 },
        });
      } else {
        // New Like
        const updated = await Comment.findByIdAndUpdate(
          id,
          {
            $push: { likedBy: voterId },
            $inc: { likes: 1 },
          },
          { new: true },
        ).populate("userId", "username");

        // 3. TRIGGER NOTIFICATION
        // Only notify if: 1. It's a like, 2. Not the owner liking their own comment
        if (updated.userId._id.toString() !== voterId) {
          await logNotification({
            recipient: updated.userId._id,
            sender: voterId,
            type: "LIKE",
            novelId: updated.novelId,
            commentId: updated._id,
          });
        }
        return res.status(200).json(updated);
      }
    }

    // Default return for unlike/dislike logic
    const finalComment = await Comment.findById(id).populate(
      "userId",
      "username profilePicture",
    );
    res.status(200).json(finalComment);
  } catch (error) {
    console.error("Vote Error:", error);
    res.status(500).json({ message: error.message });
  }
};
//Get User comments
export const getUserComments = async (req, res) => {
  try {
    const userId = req.user.id;
    const comments = await Comment.find({ userId })
      .populate("userId", "username profilePicture")
      .sort({ updatedAt: -1 });
    if (!comments) {
      return res.status(404).json({ message: "Comments not found" });
    }
    res.status(200).json(comments);
  } catch (e) {
    res.status(500).json({ message: e });
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
        path: "replies",
        populate: { path: "userId", select: "username profilePicture" },
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
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this comment" });
    }

    await comment.deleteOne();
    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
