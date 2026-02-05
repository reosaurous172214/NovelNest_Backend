import Novel from "../../models/Novel.js";
import User from "../../models/User.js";
import ModerationLog from "../../models/ModerationLog.js"; // Import the log model

// Novel Admin Controller
// adminController.js
//get a single novel for view
export const getSingleNovel = async (req, res) =>{
  try{
    const {novelId} = req.params;
    if(!novelId){
      return res.status(404).json("Novel not found");
    }
    const novel = await Novel.findById(novelId);
    res.status(200).json(novel);
  }
  catch(e){
    console.error(e);
    res.status(500).json("Couldn't Get the requested Novel");
  }
}
//get all novels
export const adminGetAllNovels = async (req, res) => {
  try {
    // We populate author to show "Author Name" in the admin table
    const novels = await Novel.find()
      .populate("author", "username email")
      .sort({ createdAt: -1 }).limit(50);

    res.status(200).json(novels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteNovelByAdmin = async (req, res) => {
  try {
    const { novelId } = req.params;
    const deletedNovel = await Novel.findByIdAndDelete(novelId);
    
    if (!deletedNovel) {
      return res.status(404).json({ success: false, message: "Novel not found!!" });
    }

    await ModerationLog.create({
      adminId: req.user.id,
      actionType: 'DELETE_NOVEL',
      targetId: novelId,
      reason: req.body.reason || "Policy Violation"
    });

    // Ensure we send a clear success flag
    res.status(200).json({ 
      success: true, 
      message: "Novel Deleted Successfully.",
      deletedId: novelId 
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// User Admin Controller
export const banUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const bannedUser = await User.findByIdAndUpdate(userId, { isBanned: true });

    if (!bannedUser) {
      return res.status(404).json({ message: "User Not Found!!" });
    }

    // ✅ LOG THE ACTION
    await ModerationLog.create({
      adminId: req.user._id,
      actionType: 'BAN_USER',
      targetId: userId,
      reason: req.body.reason || "Terms of Service Violation"
    });

    res.status(200).json({ message: "User Banned Successfully." });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};


// @desc    Get all moderation logs
export const getModerationLogs = async (req, res) => {
  try {
    // We sort by 'timestamp' descending (-1) to see newest actions first
    const logs = await ModerationLog.find()
      .populate("adminId", "name email") 
      .sort({ timestamp: -1 })
      .limit(10);

    res.status(200).json(logs);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};