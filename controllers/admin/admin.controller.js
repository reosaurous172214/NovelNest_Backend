import Novel from "../../models/Novel.js";
import User from "../../models/User.js";
import ModerationLog from "../../models/ModerationLog.js"; // Import the log model
import Request from "../../models/Request.js";
import mongoose from "mongoose";
import { logNotification } from "../../services/notification.service.js";
import Transaction from "../../models/Transaction.js"; 
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
      { $group: { _id: null, total: { $sum: "$wallet.balance" } } },
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
    res
      .status(500)
      .json({
        message: "Error fetching dashboard telemetry",
        error: error.message,
      });
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
      targetModel: 'Novel',
      targetId: novelId,
      targetMetadata: {
        name: deletedNovel.title,
        image: deletedNovel.coverImage
      },
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
export const deleteUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Find the user first to ensure they exist
    const userToDelete = await User.findById(userId);

    if (!userToDelete) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found in the registry." 
      });
    }

    // 2. Create the Moderation Log BEFORE deleting the user
    // This ensures the database integrity for the targetId reference
    await ModerationLog.create({
      adminId: req.user.id, // Support both formats
      actionType: "DELETE_USER",
      targetModel: 'User',
      targetId: userId,
      targetMetadata: {
        name: userToDelete.username,
        image: userToDelete.profilePicture
      },
      reason:  "Policy Violation",
    });

    // 3. Now perform the deletion
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "User deleted successfully.",
      deletedId: userId,
    });
  } catch (e) {
    console.error("Delete Controller Error:", e);
    res.status(500).json({ 
      success: false, 
      message: "Server error during deletion: " + e.message 
    });
  }
};
// User Admin Controller
//Get all Users
export const adminGetAllUsers = async (req, res) => {
  try {
    // We populate author to show "Author Name" in the admin table
    const users = await User.find()
      .populate("wallet", "balance")
      .sort({ createdAt: -1 })
      .limit(50);

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
        message: "You cannot ban your own account.",
      });
    }

    const userToBan = await User.findById(userId);

    if (!userToBan) {
      return res.status(404).json({
        message: "User Not Found!!",
      });
    }
    if (userToBan.isBanned) {
      return res.status(403).json({
        message: "User is already restricted.",
      });
    }

    userToBan.isBanned = true;
    await userToBan.save();
    await ModerationLog.create({
      adminId: req.user.id,
      actionType: "BAN_USER",
      targetModel: 'User',
      targetId: userId,
      reason: reason || "Terms of Service Violation",
    });

    res.status(200).json({
      message: `User ${userToBan.username} restricted successfully.`,
    });
  } catch (e) {
    res.status(500).json({
      message: e.message,
    });
  }
};
export const unBanUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const userToUnBan = await User.findById(userId);

    if (!userToUnBan) {
      return res.status(404).json({
        message: "User Not Found!!",
      });
    }
    if (!userToUnBan.isBanned) {
      return res.status(403).json({
        message: "User is already Unbanned.",
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
      message: `User ${userToUnBan.username} unbanned successfully.`,
    });
  } catch (e) {
    res.status(500).json({
      message: e.message,
    });
  }
};

// admin.controller.js
export const getModerationLogs = async (req, res) => {
  try {
    const logs = await ModerationLog.find()
      .populate({
        path: "adminId",
        select: "username profilePicture"
      })
      // We populate targetId without a model because refPath handles it.
      // Note: If targetId is null after this, the object was likely deleted.
      .populate("targetId") 
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    const safeLogs = logs.map(log => {
      // Determine if we are looking for User data or Novel data
      const isUserType = log.targetModel === 'User';
      
      return {
        ...log,
        // If targetId is a string (ID) and not an object, population failed.
        // If targetId is null, the document was deleted.
        targetId: (log.targetId && typeof log.targetId === 'object') 
          ? log.targetId 
          : { 
              _id: log.targetId || "DELETED",
              username: isUserType ? "Deleted Member" : undefined,
              title: !isUserType ? "Deleted Content" : undefined,
              profilePicture: null,
              coverImage: null
            }
      };
    });

    res.status(200).json(safeLogs);
  } catch (e) {
    console.error("Audit Sync Error:", e);
    res.status(500).json({ message: "Error retrieving audit logs." });
  }
};
export const deleteModerationLogs = async (req, res) => {
  try {
    const { logIds, clearAll } = req.body;

    if (clearAll) {
      // Wipes the entire ledger
      await ModerationLog.deleteMany({});
      return res.status(200).json({ message: "Registry cleared successfully." });
    }

    if (!logIds || logIds.length === 0) {
      return res.status(400).json({ message: "No logs specified for deletion." });
    }

    // Deletes specific selected logs
    await ModerationLog.deleteMany({ _id: { $in: logIds } });
    res.status(200).json({ message: "Selected logs deleted successfully." });
  } catch (e) {
    res.status(500).json({ message: "System Error: Deletion protocol failed." });
  }
};
export const getAdminRequest = async (req, res) => {
  try {
    // 1. Double check that the user is actually an admin
    // (This should also be handled by your middleware)
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Admin clearance required." });
    }

    // 2. Fetch requests, populate sender info, and sort by newest first
    const requests = await Request.find()
      .populate("user", "username email profilePicture role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("❌ Admin Fetch Error:", error.message);
    res.status(500).json({ message: "Neural link failed: " + error.message });
  }
};

export const updateRequestStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    // 1. Update the Request document
    const request = await Request.findByIdAndUpdate(
      id,
      { status, adminNotes, reviewedAt: Date.now() },
      { new: true, session },
    ).populate("user");

    if (!request) {
      throw new Error("Request protocol not found in registry.");
    }

    // 2. Special Logic: Author Upgrade Approval
    if (status === "approved" && request.type === "author_upgrade") {
      await User.findByIdAndUpdate(
        request.user._id,
        { role: "author" },
        { session },
      );
    }

    // 3. Notify the User of the decision
    // This creates the notification within the transaction
    await logNotification(
      [
        {
          recipient: request.user._id,
          type: "system",
          message: `Your status for '${request.type.replace("_", " ")}' has been updated to ${status.toUpperCase()}.`,
          link: "/profile/requests",
        },
      ],
      { session },
    );
    await session.commitTransaction();
    res
      .status(200)
      .json({ message: `Request ${status} successfully`, data: request });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};
// Fetch all users for PDF export (No limit)
export const exportAllUsers = async (req, res) => {
  try {
    // Select specific fields to keep the PDF lightweight
    const users = await User.find({}, "username email walletAddress nestCoins createdAt isBanned")
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user database for export." });
  }
};

// Fetch all transactions for PDF export
// Note: You must have a Transaction model imported to use this.

export const exportAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate("user", "username") // Include username for the report
      .sort({ createdAt: -1 });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch transaction ledger for export." });
  }
};
// admin.controller.js
// controllers/adminAnalyticsController.js


export const getAnalyticsData = async (req, res) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Using Promise.allSettled so one failing query doesn't crash the whole response
    const results = await Promise.allSettled([
      // 1. Core Summary Stats
      Transaction.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }
      ]),

      // 2. Monthly Revenue (Current Month)
      Transaction.aggregate([
        { $match: { 
            status: "completed", 
            createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } 
        } },
        { $group: { _id: null, monthlyRevenue: { $sum: "$amount" }, count: { $sum: 1 } } }
      ]),

      // 3. Revenue Trend (6 Months)
      Transaction.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo }, status: "completed" } },
        {
          $group: {
            _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
            amount: { $sum: "$amount" }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]),

      // 4. Genre Popularity (from Novel schema)
      Novel.aggregate([
        { $unwind: "$genres" },
        { $group: { _id: "$genres", count: { $sum: 1 }, avgViews: { $avg: "$views" } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),

      // 5. Top Novels (Virality Score)
      Novel.aggregate([
        { $project: { 
            title: 1, 
            genres: 1, 
            views: 1, 
            revenue: { $literal: 0 }, // If you don't store revenue on Novel yet
            favCount: { $size: { $ifNull: ["$favoritedBy", []] } },
            viralityScore: {
              $cond: [
                { $gt: ["$views", 0] },
                { $divide: [{ $size: { $ifNull: ["$favoritedBy", []] } }, "$views"] },
                0
              ]
            }
        }},
        { $sort: { viralityScore: -1 } },
        { $limit: 5 }
      ])
    ]);

    // Format the results safely
    const getValue = (index, path, fallback) => {
      const res = results[index];
      return res.status === 'fulfilled' ? (res.value[0]?.[path] || fallback) : fallback;
    };

    res.status(200).json({
      summary: {
        totalRevenue: getValue(0, 'totalRevenue', 0),
        monthlyRevenue: getValue(1, 'monthlyRevenue', 0),
        growthRate: 12.5, // You can calculate this by comparing current vs last month
        activeDeals: getValue(1, 'count', 0)
      },
      charts: {
        revenue: results[2].status === 'fulfilled' ? results[2].value : [],
        genres: results[3].status === 'fulfilled' ? results[3].value : []
      },
      topContent: results[4].status === 'fulfilled' ? results[4].value : []
    });

  } catch (err) {
    console.error("CRITICAL ANALYTICS ERROR:", err);
    res.status(500).json({ message: "Server encountered an error processing analytics" });
  }
};