import Novel from "../../models/Novel.js";
import User from "../../models/User.js";
import ModerationLog from "../../models/ModerationLog.js"; // Import the log model

// Novel Admin Controller
// adminController.js
export const getDashboardStats = async (req, res) => {
  try {
    // 1. Total Novels Count
    const totalNovels = await Novel.countDocuments();

    // 2. Pending Requests (Assuming novels have a status field)
    const pendingRequests = await Novel.countDocuments({ status: "pending" });

    // 3. New Users Today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: startOfToday },
    });

    // 4. Total Revenue (Summing all completed wallet transactions)
    // Adjust "amount" and "status" based on your Wallet/Transaction schema
    const revenueData = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$wallet.balance" } } } 
    ]);
    // Note: This sums current balances. For real revenue, aggregate your Transactions collection.
    const totalRevenue = revenueData[0]?.total || 0;

    res.status(200).json({
      totalNovels,
      pendingRequests,
      newUsersToday,
      totalRevenue,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching dashboard telemetry", error: error.message });
  }
};
//get a single novel for view
export const getSingleNovel = async (req, res) => {
  try {
    const { novelId } = req.params;
    if (!novelId) {
      return res.status(404).json("Novel not found");
    }
    const novel = await Novel.findById(novelId);
    res.status(200).json(novel);
  } catch (e) {
    console.error(e);
    res.status(500).json("Couldn't Get the requested Novel");
  }
};
//get all novels
export const adminGetAllNovels = async (req, res) => {
  try {
    // We populate author to show "Author Name" in the admin table
    const novels = await Novel.find()
      .populate("author", "username email")
      .sort({ createdAt: -1 })
      .limit(50);

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
      return res
        .status(404)
        .json({ success: false, message: "Novel not found!!" });
    }

    await ModerationLog.create({
      adminId: req.user.id,
      actionType: "DELETE_NOVEL",
      targetId: novelId,
      reason: req.body.reason || "Policy Violation",
    });

    // Ensure we send a clear success flag
    res.status(200).json({
      success: true,
      message: "Novel Deleted Successfully.",
      deletedId: novelId,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// User Admin Controller
//Get all Users
export const adminGetAllUsers = async (req, res) => {
  try {
    // We populate author to show "Author Name" in the admin table
    const users = await User.find().sort({ createdAt: -1 }).limit(50);

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const banUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    // 1. Security: Prevent self-ban
    if (req.user.id === userId) {
      return res.status(400).json({ 
        message: "You cannot ban your own account." 
      });
    }

    const userToBan = await User.findById(userId);
    
    if (!userToBan) {
      return res.status(404).json({ 
        message: "User Not Found!!" 
      });
    }
    if (userToBan.isBanned) {
      return res.status(403).json({ 
        message: "User is already restricted." 
      });
    }

    userToBan.isBanned = true;
    await userToBan.save();
    await ModerationLog.create({
      adminId: req.user.id,
      actionType: "BAN_USER",
      targetId: userId,
      reason: reason || "Terms of Service Violation",
    });

    res.status(200).json({ 
      message: `User ${userToBan.username} restricted successfully.` 
    });
    
  } catch (e) {
    res.status(500).json({ 
      message: e.message 
    });
  }
};
export const unBanUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    

    const userToUnBan = await User.findById(userId);
    
    if (!userToUnBan) {
      return res.status(404).json({ 
        message: "User Not Found!!" 
      });
    }
    if (!userToUnBan.isBanned) {
      return res.status(403).json({ 
        message: "User is already Unbanned." 
      });
    }

    userToUnBan.isBanned = false;
    await userToUnBan.save();
    // await ModerationLog.create({
    //   adminId: req.user.id,
    //   actionType: "BAN_USER",
    //   targetId: userId,
    //   reason: reason || "Terms of Service Violation",
    // });

    res.status(200).json({ 
      message: `User ${userToUnBan.username} unbanned successfully.` 
    });
    
  } catch (e) {
    res.status(500).json({ 
      message: e.message 
    });
  }
};


// admin.controller.js
export const getModerationLogs = async (req, res) => {
  try {
    const logs = await ModerationLog.find()
      .populate("adminId", "username") // Still good to have the admin name
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();

    // No mapping, no lookups. Just send the raw logs.
    res.status(200).json(logs);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
