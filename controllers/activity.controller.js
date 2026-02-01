import Activity from "../models/Activity.js";

export const createActivity = async (req, res) => {
  try {
    const { actionType, targetType, targetId, meta = {} } = req.body;

    if (!actionType || !targetType || !targetId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const userId = req.user._id; // ✅ secure source

    let activity = await Activity.findOne({
      userId,
      actionType,
      targetType,
      targetId,
    });

    if (!activity) {
      activity = await Activity.create({
        userId,
        actionType,
        targetType,
        targetId,
        meta,
      });
    } else {
      // 🔥 update timestamp so it appears recent
      activity.createdAt = new Date();
      activity.meta = meta || activity.meta;
      await activity.save();
    }

    res.status(201).json({
      success: true,
      activityId: activity._id,
    });
  } catch (err) {
    console.error("Create activity error:", err);
    res.status(500).json({ message: "Failed to create activity" });
  }
};
export const getUserActivities = async (req, res) => {
  try {
    const activities = await Activity.find({ userId: req.user.id }) // Use consistent ID
      .sort({ createdAt: -1 })
      .limit(6);
    
    res.json(
      activities.map((a) => ({
        idx: a._id,
        action: a.actionType,// Keep this for your frontend filter logic
        createdAt: a.createdAt,   // Use the standard name
        meta: a.meta,             // Pass the whole meta so mapActivity() works!
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const getReadingTime = async (req, res) => {
  const activities = await Activity.find({ 
    userId: req.user._id, 
    actionType: "READ_CHAPTER" 
  }).sort({ createdAt: 1 });

  let totalMinutes = 0;
  const MAX_GAP = 30 * 60 * 1000; // 30 minutes in milliseconds

  for (let i = 0; i < activities.length - 1; i++) {
    const startTime = new Date(activities[i].createdAt);
    const endTime = new Date(activities[i + 1].createdAt);
    const gap = endTime - startTime;

    if (gap < MAX_GAP) {
      totalMinutes += gap / (1000 * 60);
    }
  }

  const hours = (totalMinutes / 60).toFixed(1);
  res.json({ hours });
};