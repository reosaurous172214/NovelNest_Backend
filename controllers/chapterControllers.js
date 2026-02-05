import { CHAPTER_LIMITS } from "../config/chapterLimit.js";
import Chapter from "../models/Chapter.js";
import Novel from "../models/Novel.js";
import { logActivity } from "../services/activity.service.js";
import { logHistory } from "../services/user.service.js";
import { logNotification } from "../services/notification.service.js";

/* ---------------- CREATE CHAPTER ---------------- */
export const createChapter = async (req, res) => {
  try {
    const { novelId, title, content } = req.body;

    const novel = await Novel.findById(novelId);
    if (!novel) return res.status(404).json({ message: "Story not found" });

    // Safety: check req.user.id or req.user._id based on your middleware
    const userId = req.user.id || req.user._id;

    if (novel.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const lastChapter = await Chapter.findOne({ novelId }).sort({ chapterNumber: -1 });
    const nextNumber = lastChapter ? lastChapter.chapterNumber + 1 : 1;

    const newChapter = new Chapter({
      novelId,
      title,
      content,
      chapterNumber: nextNumber,
    });
    await newChapter.save();

    // Update Novel Chapter Count
    novel.totalChapters = (novel.totalChapters || 0) + 1;
    await novel.save();

    // ✅ FIXED: Using logActivity Service
    try {
      await logActivity({
        userId: userId,
        actionType: "CREATE_CHAPTER",
        targetType: "CHAPTER",
        targetId: newChapter._id,
        meta: {
          novelTitle: novel.title,
          chapterTitle: newChapter.title,
        },
      });
    } catch (actErr) {
      console.error("Activity log failed:", actErr.message);
    }

    // Notifications
    const favoritedUsers = novel.favoritedBy || [];
    if (favoritedUsers.length > 0) {
      Promise.all(favoritedUsers.map(async (uId) => {
        try {
          await logNotification({
            recipient: uId,
            type: "NEW_CHAPTER",
            novelId: novel._id,
            chapterId: newChapter._id,
          });
        } catch (err) {
          console.error("Notification failed for user:", uId);
        }
      }));
    }

    res.status(201).json({ message: "Chapter published!", chapter: newChapter });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- UPDATE CHAPTER ---------------- */
export const updateChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id || req.user._id;

    const chapter = await Chapter.findById(chapterId);
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });

    const novel = await Novel.findById(chapter.novelId);
    if (novel.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (title) chapter.title = title;
    if (content) chapter.content = content;
    chapter.updatedAt = Date.now();

    await chapter.save();
    res.status(200).json({ message: "Changes saved", chapter });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- DELETE CHAPTER ---------------- */
export const deleteChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const userId = req.user.id || req.user._id;

    const chapter = await Chapter.findById(chapterId);
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });

    const novel = await Novel.findById(chapter.novelId);
    if (novel.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Chapter.findByIdAndDelete(chapterId);

    if (novel.totalChapters > 0) {
      novel.totalChapters -= 1;
      await novel.save();
    }

    res.status(200).json({ message: "Chapter deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- GET CHAPTERS BY NOVEL ---------------- */
export const getChapterByNovel = async (req, res) => {
  try {
    const { novelId } = req.params;
    const chapters = await Chapter.find({ novelId })
      .select("title chapterNumber")
      .sort({ chapterNumber: 1 })
      .collation({ locale: "en", numericOrdering: true })
      .lean();

    res.status(200).json({ chapters });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- GET SINGLE CHAPTER ---------------- */

export const getSingleChapter = async (req, res) => {
  try {
    const { novelId, chapterNumber } = req.params;
    const chapterNo = Number(chapterNumber);

    const chapter = await Chapter.findOne({ novelId, chapterNumber: chapterNo });
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });

    // Access Logic
    let limit = CHAPTER_LIMITS.GUEST;
    if (req.user) {
      limit = req.user.role === "PREMIUM" ? CHAPTER_LIMITS.PREMIUM : CHAPTER_LIMITS.FREE;
    }

    if (chapterNo > limit) {
      return res.status(403).json({ code: "CHAPTER_LIMIT_REACHED", allowedChapters: limit });
    }

    // ✅ FIXED: Services used consistently
    if (req.user) {
      const userId = req.user.id ;
      const novel = await Novel.findById(novelId);

      await logActivity({
        userId: userId,
        actionType: "READ_CHAPTER",
        targetType: "CHAPTER",
        targetId: chapter._id,
        meta: {
          novelTitle: novel?.title,
          chapterTitle: chapter.title,
          chapterNumber: chapterNo,
        },
      });

      await logHistory({
        userId: userId,
        novelId: novelId,
        chapterNumber: chapterNo,
      });
    }

    const nextChapter = await Chapter.findOne({
      novelId,
      chapterNumber: chapterNo + 1,
    }).select("_id chapterNumber title");

    res.status(200).json({ chapter, hasNext: !!nextChapter });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};