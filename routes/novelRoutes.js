import express from "express";
import {
  createNovel,
  getAllPublishedNovels,
  getNovelById,
  getMyNovels,
  updateNovel,
  deleteNovel,
  togglePublish,
  getRecommendedNovels,
} from "../controllers/novelControllers.js";

import protect from "../middleware/authMiddleware.js";
import {upload} from "../middleware/upload.js";
import { isAuthor } from "../middleware/isAuthorMiddleware.js";
import { isAdmin } from "../middleware/isAdminMiddleware.js";

const router = express.Router();
router.get("/", getAllPublishedNovels);
router.get("/recommended/:id", getRecommendedNovels);
router.get("/my", protect, isAuthor, getMyNovels);
router.get("/:id", getNovelById);
router.post("/", protect, isAuthor, upload.single("coverImage"), createNovel);
router.put("/:id", protect, isAuthor, upload.single("coverImage"), updateNovel);
router.delete("/:id", protect, isAuthor, deleteNovel);
router.patch("/:id/publish", protect, togglePublish);

export default router;
