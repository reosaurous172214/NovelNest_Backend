import express from "express";
import {
  createNovel,
  getAllPublishedNovels,
  getNovelById,
  getMyNovels,
  updateNovel,
  deleteNovel,
  togglePublish,
  getRecommendedNovels
} from "../controllers/novelControllers.js";

import protect from "../middleware/authMiddleware.js";
import {upload} from "../middleware/upload.js";

const router = express.Router();
router.get("/", getAllPublishedNovels);
router.get("/recommended/:id", getRecommendedNovels);
router.get("/my", protect, getMyNovels);
router.get("/:id", getNovelById);
router.post("/", protect, upload.single("coverImage"), createNovel);
router.put("/:id", protect, upload.single("coverImage"), updateNovel);
router.delete("/:id", protect, deleteNovel);
router.patch("/:id/publish", protect, togglePublish);

export default router;
