import Activity from "../models/Activity.js";

export const logActivity = async ({ userId, actionType, targetType, targetId, meta = {} }) => {
  if (!userId || !actionType || !targetType || !targetId) return;

  try {
    // 1. Find the existing document
    const existing = await Activity.findOne({
      userId,
      actionType,
      targetType,
      targetId,
    });

    if (existing) {
      // 2. Update the timestamp and meta
      // Note: If you want to sort by latest, sort by 'updatedAt' in your queries
      existing.meta = meta;
      
      // Tell Mongoose specifically that meta and createdAt have changed
      existing.markModified('meta');
      existing.markModified('createdAt'); // Force override if you really want to use createdAt
      
      existing.updatedAt = new Date(); 
      await existing.save();
      console.log("✅ Activity Updated");
    } else {
      // 3. Create new if not found
      await Activity.create({
        userId,
        actionType,
        targetType,
        targetId,
        meta,
      });
      console.log("✨ New Activity Created");
    }
  } catch (error) {
    console.error("❌ logActivity Error:", error.message);
  }
};