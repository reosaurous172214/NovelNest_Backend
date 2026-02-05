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
import { isAuthor } from "../middleware/isAuthorMiddleware.js";
const router = express.Router();
router.post("/", protect, isAuthor,  createChapter);
router.get("/novel/:novelId", getChapterByNovel);
router.get("/:novelId/num/:chapterNumber",optionalProtect, getSingleChapter);
router.put("/:chapterId", protect, isAuthor, updateChapter);
router.delete("/:chapterId", protect, isAuthor, deleteChapter);
export default router;


