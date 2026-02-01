import Activity from "../models/Activity.js";

export const logActivity = async ({
  userId,
  actionType,
  targetType,
  targetId,
  meta = {},
}) => {
  if (!userId || !actionType || !targetType || !targetId) return;

  // Find latest SAME activity by same user on same target
  const existing = await Activity.findOne({
    userId,
    actionType,
    targetType,
    targetId,
  }).sort({ createdAt: -1 });

  if (existing) {
    // Update timestamp instead of creating duplicate
    existing.createdAt = new Date();
    existing.meta = meta;
    await existing.save();
  } else {
    await Activity.create({
      userId,
      actionType,
      targetType,
      targetId,
      meta,
    });
  }
};
