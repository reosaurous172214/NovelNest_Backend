import User from "../models/User.js";
import Novel from "../models/Novel.js";
import Notification from "../models/Notification.js";

export const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .sort({ createdAt: -1 }) // Newest first
            .limit(20)
            .populate({
                path: "novelId",
                select: "title coverImage slug" 
            });

        // Calculate unread count for the Navbar badge
        const unreadCount = await Notification.countDocuments({ 
            recipient: req.user.id, 
            isRead: false 
        });

        res.status(200).json({
            notifications,
            unreadCount
        });
    } catch (error) {
        console.error("Get Notifications Error:", error);
        res.status(500).json({ message: "Failed to fetch notifications" });
    }
};
export const createNotification = async (req, res) => {
    try {
        const { novelId, message, title } = req.body;

        if (!novelId || !message) {
            return res.status(400).json({ message: "Novel ID and message are required." });
        }

        // 1. Find the novel to verify existence
        const novel = await Novel.findById(novelId);
        if (!novel) {
            return res.status(404).json({ message: "Novel not found." });
        }

        // 2. Query users who have this novelId in their favourites.novel field
        // This handles your specific schema structure: favourites: [{ novel: ID, addedAt: Date }]
        const subscribers = await User.find({ 
            "favourites.novel": novelId 
        }).select("_id");

        if (subscribers.length === 0) {
            return res.status(200).json({ message: "No subscribers to notify." });
        }

        // 3. Prepare bulk notification data
        const notificationData = subscribers.map(user => ({
            recipient: user._id,
            title: title || `Update on ${novel.title}`,
            message: message,
            novelId: novelId,
            isRead: false
        }));

        // 4. Bulk insert for high performance
        await Notification.insertMany(notificationData);

        res.status(201).json({ 
            message: `Notifications sent to ${subscribers.length} users.` 
        });

    } catch (error) {
        console.error("Notification Error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};