import { CHAPTER_LIMITS } from "../config/chapterLimit.js";
import Chapter from "../models/Chapter.js";
import Transaction from "../models/Transaction.js";
import Novel from "../models/Novel.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { logActivity } from "../services/activity.service.js";
import { logHistory } from "../services/user.service.js";
import { logNotification } from "../services/notification.service.js";
import { logPayAuthor } from "../services/author.wallet.js";

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

    const lastChapter = await Chapter.findOne({ novelId }).sort({
      chapterNumber: -1,
    });
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
      Promise.all(
        favoritedUsers.map(async (uId) => {
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
        }),
      );
    }

    res
      .status(201)
      .json({ message: "Chapter published!", chapter: newChapter });
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
// Variable to store temporary view locks (In-memory cache)
const viewCache = new Map();
// getting single chapter
export const getSingleChapter = async (req, res) => {
  try {
    const { novelId, chapterNumber } = req.params;
    const chapterNo = Number(chapterNumber);
    const chapter = await Chapter.findOne({ novelId, chapterNumber: chapterNo });
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });

    // 1. Access Logic
    let limit = CHAPTER_LIMITS.GUEST;
    let isUnlocked = false;

    if (req.user) {
      const user = await User.findById(req.user.id);
      limit = user.role === "PREMIUM" ? CHAPTER_LIMITS.PREMIUM : CHAPTER_LIMITS.FREE;
      
      // Fix: Check the chapterId property inside the unlockedChapters array
      isUnlocked = user.unlockedChapters.some(
        (id) => id.toString() === chapter._id.toString()
      );
      isUnlocked = isUnlocked || user.unlockedNovels.some(
        (id) => id.toString() === novelId
      );
    }

    if (chapterNo > limit && !isUnlocked) {
      return res.status(403).json({ 
      code: "CHAPTER_LIMIT_REACHED,BUY IT",
      message: "Please purchase this chapter to continue reading.",
      chapterId:chapter._id,
      allowedChapters: limit 
      });
    }

    // 2. SMART VIEW INCREMENT (The +2 Fix)
    // Create a unique key for this user + this novel
    const userId = req.user?.id || req.ip; 
    const lockKey = `${userId}-${novelId}`;
    const now = Date.now();
    const lastView = viewCache.get(lockKey);

    // Only increment if they haven't viewed this specific novel in the last 10 seconds
    if (!lastView || (now - lastView > 10000)) {
        await Novel.findByIdAndUpdate(novelId, { $inc: { views: 1 } });
        viewCache.set(lockKey, now);

        // Cleanup: Remove the key after 11 seconds to keep memory clean
        setTimeout(() => viewCache.delete(lockKey), 11000);
    }

    // 3. Activity Logging (Background)
    if (req.user) {
      const novel = await Novel.findById(novelId);
      
      Promise.all([
        logActivity({
          userId: req.user.id,
          actionType: "READ_CHAPTER",
          targetType: "CHAPTER",
          targetId: chapter._id,
          meta: {
            novelTitle: novel?.title,
            chapterTitle: chapter.title,
            chapterNumber: chapterNo,
          },
        }),
        logHistory({
          userId: req.user.id,
          novelId: novelId,
          chapterNumber: chapterNo,
        })
      ]).catch(err => console.error("Background logging error:", err.message));
    }

    // 4. Fetch Next Chapter info
    const nextChapter = await Chapter.findOne({
      novelId,
      chapterNumber: { $gt: chapterNo },
    })
    .sort({ chapterNumber: 1 })
    .select("_id chapterNumber title");

    res.status(200).json({ 
      chapter, 
      hasNext: !!nextChapter,
      nextChapterId: nextChapter?._id || null 
    });
  } catch (err) {
    console.error("Reader Error:", err.message);
    res.status(500).json({ message: err.message });
  }
};
export const unlockSingleChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const chapterCost = 50; 

    // 1. Fetch Data
    const chapter = await Chapter.findById(chapterId).populate("novelId");
    if (!chapter) return res.status(404).json({ message: "Chapter not found." });

    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).populate('wallet');
    
    if (!user || !user.wallet) {
      return res.status(404).json({ message: "User or Wallet not found." });
    }

    // 2. Access Check
    const alreadyUnlocked = user.unlockedChapters.some(
      (id) => id.toString() === chapterId.toString()
    );
    if (alreadyUnlocked) {
      console.log("chapter already unlocked");
      return res.status(400).json({ message: "Chapter already in your library." });
    }

    if (user.wallet.balance < chapterCost) {
      return res.status(403).json({ message: "Insufficient NestCoins." });
    }

    // --- 3. THE TRANSACTION LOGIC ---
    const isPremium = user.subscription.plan === "free";
    user.wallet.balance -= isPremium?chapterCost:0.4*chapterCost;
    user.wallet.totalSpent += isPremium?chapterCost:0.4*chapterCost;
    user.unlockedChapters.push(chapterId);

    // Create Transaction record consistent with your Stripe deposit format
    await Transaction.create({
      wallet: user.wallet._id,
      user: userId,
      amount: -(isPremium?chapterCost:0.4*chapterCost), // Negative value for withdrawal
      type: 'withdrawal', 
      status: 'completed',
      balanceAfter: user.wallet.balance,
      description: `Unlocked Chapter: ${chapter.title}`
    });

    // 4. Persistence
    await Promise.all([
      user.wallet.save(),
      user.save()
    ]);

    // 5. Background Tasks
    await logActivity({
      userId: userId,
      actionType: "BOUGHT_CHAPTER",
      targetType: "PURCHASE",
      targetId: chapterId,
      meta: { chapterTitle: chapter.title, chapterNumber: chapter.chapterNumber },
    });

    const paymentSuccess = await logPayAuthor({ chapter, Price: chapterCost });

    if (paymentSuccess) {
      const authorId = chapter.novelId.author;
      await Promise.all([
        Notification.create({
          recipient: authorId,
          sender: user._id,
          type: "EARNING",
          message: `You earned coins from a new reader on ${chapter.novelId.title}`,
          data: { chapterId }
        }),
        logNotification({
          recipient: authorId,
          sender: user._id,
          type: "EARNING",
          novelId: chapter.novelId._id,
          chapterId: chapter._id,
        })
      ]);
    }

    res.status(200).json({ 
      message: "Chapter Unlocked Successfully.",
      remainingBalance: user.wallet.balance 
    });

  } catch (e) {
    console.error("Unlock Error:", e.message);
    res.status(500).json({ message: "Error during unlock process." });
  }
};