import Notification from "../models/Notification.js";

/**
 * @param {Object} data - { recipient, sender, type, novelId, chapterId, commentId }
 */
export const logNotification = async (data) => {
  try {
    // We use create so it triggers the Schema indexes
    const notification = await Notification.create(data);
    return notification;
  } catch (error) {
    console.error("Notification Service Error:", error);
  }
};