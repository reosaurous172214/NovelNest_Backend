import {
    createChapter  ,
    getChapterByNovel,
    getSingleChapter,
    updateChapter,
    deleteChapter
} from "../controllers/chapterControllers.js";
import express from "express";
import protect from "../middleware/authMiddleware.js";
import optionalProtect from "../middleware/optionalProtect.js";
const router = express.Router();
router.post("/", protect, createChapter);
router.get("/novel/:novelId", getChapterByNovel);
router.get("/:novelId/num/:chapterNumber",optionalProtect, getSingleChapter);
router.put("/:chapterId", protect, updateChapter);
router.delete("/:chapterId", protect, deleteChapter);
export default router;
