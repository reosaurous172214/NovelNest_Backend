import express from "express";
import {
    getSingleNovel,
    adminGetAllNovels,
    banUserByAdmin,
    deleteNovelByAdmin,
    getModerationLogs
} from "../controllers/admin/admin.controller.js";
import {isAdmin} from "../middleware/isAdminMiddleware.js";
import protect from "../middleware/authMiddleware.js";
const router = express.Router();
router.use(protect)
// @route get all novels

router.get("/novels", isAdmin, adminGetAllNovels);
router.get("/novels/:novelId",isAdmin,getSingleNovel);

// @route ban the user
router.put("/ban/:userId", isAdmin, banUserByAdmin);
// @route delete the novel
router.delete("/delete/:novelId",isAdmin, deleteNovelByAdmin);
// @route   GET /api/admin/logs
router.get("/logs", getModerationLogs);

export default router;