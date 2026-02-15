import express from "express";
import {
    getSingleNovel,
    adminGetAllNovels,
    adminGetAllUsers,
    getAnalyticsData,
    banUserByAdmin,
    unBanUserByAdmin,
    deleteNovelByAdmin,
    deleteUserByAdmin,
    getModerationLogs,
    getDashboardStats,
    getAdminRequest,
    updateRequestStatus,
    exportAllTransactions,
    deleteModerationLogs,
    exportAllUsers,
} from "../controllers/admin/admin.controller.js";
import { isAdmin } from "../middleware/isAdminMiddleware.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply global protection: User must be logged in for any route here
router.use(protect);

// @route   GET /api/admin/users
// Fetches all users for the management dashboard
router.get('/users/export', isAdmin, exportAllUsers);

// Route to fetch all transactions for the PDF Ledger
router.get("/transactions/export",isAdmin, exportAllTransactions);
router.get("/analytics",isAdmin,getAnalyticsData);
router.get("/users", isAdmin, adminGetAllUsers);
router.get("/stats",  isAdmin, getDashboardStats);
router.get("/request",isAdmin,getAdminRequest);
router.patch("/request/:id",isAdmin,updateRequestStatus);
// @route   GET /api/admin/novels
router.get("/novels", isAdmin, adminGetAllNovels);
router.get("/novels/:novelId", isAdmin, getSingleNovel);

// @route   PATCH /api/admin/ban/:userId
// Partial update to toggle isBanned status and log reason
router.patch("/ban/:userId", isAdmin, banUserByAdmin);
router.patch("/unban/:userId",isAdmin, unBanUserByAdmin);

// @route   DELETE /api/admin/delete/:novelId
router.delete("/delete/:novelId", isAdmin, deleteNovelByAdmin);
router.delete("/delete/users/:userId", isAdmin, deleteUserByAdmin);

// @route   GET /api/admin/logs
// Optimization: Added isAdmin protection for sensitive audit logs
router.get("/logs", isAdmin, getModerationLogs);
router.delete("/logs", isAdmin, deleteModerationLogs);
export default router;