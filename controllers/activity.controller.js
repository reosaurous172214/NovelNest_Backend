import Activity from "../models/Activity.js";
// Get Activities of The Specific user
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

// Get the Reading Time for the Authenticated user
export const getReadingTime = async (req, res) => {
  const activities = await Activity.find({ 
    userId: req.user.id, 
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
