import { CHAPTER_LIMITS } from "../config/chapterLimit.js";
import Chapter from "../models/Chapter.js";
import Novel from "../models/Novel.js";
import Activity from "../models/Activity.js";
import { logActivity } from "../services/activity.service.js";
import User from "../models/User.js";
import { logHistory } from "../services/user.service.js";
/* ---------------- CREATE CHAPTER ---------------- */
export const createChapter = async (req, res) => {
  try {
    const { novelId, title, content } = req.body;

    // 1. Verify the story exists
    const novel = await Novel.findById(novelId);
    if (!novel) {
      return res.status(404).json({ message: "Story not found" });
    }

    // 2. Security: Only the owner can add chapters
    if (novel.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You don't have permission to edit this story" });
    }

    // 3. AUTO-INCREMENT: Find the latest chapter to determine the next number
    const lastChapter = await Chapter.findOne({ novelId }).sort({ chapterNumber: -1 });
    const nextNumber = lastChapter ? lastChapter.chapterNumber + 1 : 1;

    // 4. Save the new chapter
    const newChapter = new Chapter({
      novelId,
      title,
      content,
      chapterNumber: nextNumber,
    });

    await newChapter.save();

    // 5. Automatically update the total count on the Novel
    novel.totalChapters += 1;
    await novel.save();

    // Log the activity
    await Activity.create({
      userId: req.user.id,
      actionType: "CREATE_CHAPTER",
      targetType: "CHAPTER",
      targetId: newChapter._id,
      meta: {
        novelTitle: novel.title,
        chapterTitle: newChapter.title,
      },
    });

    res.status(201).json({ 
      message: "Chapter published successfully!", 
      chapter: newChapter 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- UPDATE CHAPTER ---------------- */
export const updateChapter = async (req, res) => {
  try {
    const chapterId = req.params.chapterId;
    const { title, content } = req.body;

    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    const novel = await Novel.findById(chapter.novelId);
    if (novel.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (title) chapter.title = title;
    if (content) chapter.content = content;
    chapter.updatedAt = Date.now();

    await chapter.save();
    
    res.status(200).json({ message: "Changes saved successfully", chapter });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- DELETE CHAPTER ---------------- */
export const deleteChapter = async (req, res) => {
  try {
    const chapterId = req.params.chapterId;
    const chapter = await Chapter.findById(chapterId);
    
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    const novel = await Novel.findById(chapter.novelId);
    if (novel.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Chapter.findByIdAndDelete(chapterId);

    // Optional: Decrement total chapters if you want to keep the count synced
    if (novel.totalChapters > 0) {
      novel.totalChapters -= 1;
      await novel.save();
    }

    res.status(200).json({ message: "Chapter deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ... keep your existing getChapterByNovel and getSingleChapter as they are
/* ---------------- GET CHAPTERS BY NOVEL ---------------- */
export const getChapterByNovel = async (req, res) => {
  try {
    const { novelId } = req.params;

    const chapters = await Chapter.find({ novelId })
      .select("title chapterNumber")
      .sort({ chapterNumber: 1 }) // Primary Sort
      .collation({ locale: "en", numericOrdering: true }) // Handles string-numbers
      .lean(); // Returns faster, plain JS objects

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

    const chapter = await Chapter.findOne({
      novelId,
      chapterNumber: chapterNo,
    });

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    // 🔒 Chapter access logic
    let limit;

    if (!req.user) {
      limit = CHAPTER_LIMITS.GUEST;
    } else if (req.user.role === "PREMIUM") {
      limit = CHAPTER_LIMITS.PREMIUM;
    } else {
      limit = CHAPTER_LIMITS.FREE;
    }

    if (chapterNo > limit) {
      return res.status(403).json({
        code: "CHAPTER_LIMIT_REACHED",
        allowedChapters: limit,
      });
    }

    // 📝 Log activity
    if (req.user) {
      const novel = await Novel.findById(novelId);

      await logActivity({
        userId: req.user.id,
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
        userId:req.user.id,
        novelId:novelId,
        chapterNumber: chapterNo,
      })
    }
    const nextChapter = await Chapter.findOne({
      novelId,
      chapterNumber: parseInt(chapterNo) + 1,
    }).select("_id chapterNumber title");

    res.status(200).json({ chapter, hasNext: !!nextChapter });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

