import Notification from "../models/Notification.js";

export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate("sender", "username profilePicture") // Who did the action
      .populate("novelId", "title coverImage")      // Which book it belongs to
      .populate({
        path: "commentId",
        select: "content", // Only pull the text content of the comment
        populate: { 
          path: "userId", 
          select: "username" // Useful if you want to show who the comment belonged to originally
        }
      })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json(notifications);
  } catch (error) {
    console.error("Fetch Notifications Error:", error);
    res.status(500).json({ message: error.message });
  }
};
// PATCH: Mark single or all notifications as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params; 
    
    // If id exists, query by id. If not (null/undefined), query all for the user.
    const query = id 
      ? { _id: id, recipient: req.user.id } 
      : { recipient: req.user.id, isRead: false };
    
    await Notification.updateMany(query, { $set: { isRead: true } });
    res.status(200).json({ message: "Success" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE: Remove a specific notification
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id // Security: Ensure they own it
    });

    if (!notification) return res.status(404).json({ message: "Not found" });
    
    res.status(200).json({ message: "Notification removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// clear all
export const clearAllNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({ recipient: req.user.id });
    
    // result.deletedCount tells you how many were actually removed
    return res.status(200).json({ 
      message: "Inbox cleared successfully",
      count: result.deletedCount 
    });
  } catch (error) {
    console.error("Clear All Error:", error);
    return res.status(500).json({ message: "Server error while clearing notifications" });
  }
};