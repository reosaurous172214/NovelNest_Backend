import mongoose from "mongoose";
import Novel from "../models/Novel.js";
import { logActivity } from "../services/activity.service.js";
import Transaction from "../models/Transaction.js";
import { novelSearchTrie } from "../services/search.service.js";
import { logPayAuthor } from "../services/author.wallet.js";

import Review from "../models/Review.js";
import User from "../models/User.js";
/* ---------------- HELPER ---------------- */
const normalizeArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

/* ---------------- CREATE NOVEL ---------------- */
export const createNovel = async (req, res) => {
  try {
    const { title, description } = req.body;
    const genres = normalizeArray(req.body.genres);
    const tags = normalizeArray(req.body.tags);

    if (!title || genres.length === 0) {
      return res.status(400).json({ message: "Title and at least one genre required" });
    }

    const novel = await Novel.create({
      title,
      description,
      genres,
      tags,
      coverImage: req.file ? `/utilities/${req.file.filename}` : null,
      author: req.user.id, // Fixed to req.user.id
      isPublished: false,
      totalChapters: 0,
      rating: 0,
      views: 0,
    });

    // Sync with Trie for instant search availability
    novelSearchTrie.insert(novel.title, {
      id: novel._id,
      title: novel.title,
      cover: novel.coverImage,
    });

    await logActivity({
      userId: req.user.id, // Fixed to req.user.id
      actionType: "CREATE_NOVEL",
      targetType: "NOVEL",
      targetId: novel._id,
      meta: { novelTitle: novel.title },
    });

    res.status(201).json({ novel });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- GET ALL PUBLISHED ---------------- */
export const getAllPublishedNovels = async (req, res) => {
  try {
    const search = (req.query.search)?.trim();
    const genres = req.query.genres?.split(",").filter(Boolean);
    const tags = req.query.tags?.split(",").filter(Boolean);

    const limit = 100;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const sortBy = req.query.sortBy || "createdAt";
    const order = req.query.order === "asc" ? 1 : -1;

    const sortMap = {
      createdAt: "createdAt",
      chapters: "totalChapters",
      views: "views",
      rating: "rating",
    };

    const matchStage = {};
    if (search) matchStage.title = { $regex: search, $options: "i" };

    if (genres?.length) {
      matchStage.genres = { 
        $all: genres.map(g => new RegExp(`^${g}$`, "i")) 
      };
    }
    if (tags?.length) matchStage.tags = { $all: tags };

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "authorData",
        },
      },
      {
        $unwind: {
          path: "$authorData",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $sort: { [sortMap[sortBy] || "createdAt"]: order } },
      { $skip: skip },
      { $limit: limit }
    ];

    const novels = await Novel.aggregate(pipeline);

    res.status(200).json({
      currentPage: page,
      count: novels.length,
      novels: novels.map((n) => ({
        _id: n._id,
        title: n.title,
        description: n.description,
        genres: n.genres,
        tags: n.tags,
        coverImage: n.coverImage,
        rating: n.rating,
        views: n.views,
        totalChapters: n.totalChapters,
        author: {
          username: n.authorData?.username || "Unknown Author",
          profilePicture: n.authorData?.profilePicture || null,
        },
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- GET NOVEL BY ID ---------------- */
export const getNovelById = async (req, res) => {
  try {
    const novel = await Novel.findById(req.params.id).populate(
      "author",
      "username profilePicture",
    );

    if (!novel) return res.status(404).json({ message: "Novel not found" });

    res.status(200).json({
      id: novel._id,
      title: novel.title,
      description: novel.description,
      genres: novel.genres,
      tags: novel.tags,
      coverImage: novel.coverImage
        ? novel.coverImage.startsWith("http")
          ? novel.coverImage
          : `http://localhost:5000${novel.coverImage}`
        : null,
      author: novel.author?.username || "Anonymous",
      authorImage: novel.author?.profilePicture
        ? `http://localhost:5000${novel.author.profilePicture}`
        : null,
      isPublished: novel.isPublished,
      createdAt: novel.createdAt,
      totalChapters: novel.totalChapters,
      rating: novel.rating,
      views: novel.views,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getMyNovels = async (req, res) => {
  try {
    const novels = await Novel.find({ author: req.user._id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ novels });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- GET RECOMMENDED ---------------- */
export const getRecommendedNovels = async (req, res) => {
  try {
    const novel = await Novel.findById(req.params.id).populate({
      path: "recommendations", 
      select: "title coverImage rating views genres totalChapters",
    });

    if (!novel) return res.status(404).json({ message: "Entry not found" });
    res.status(200).json(novel.recommendations || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ---------------- UPDATE NOVEL ---------------- */
export const updateNovel = async (req, res) => {
  try {
    const { id } = req.params;
    const novel = await Novel.findById(id);

    if (!novel) {
      return res.status(404).json({ message: "Novel not found" });
    }

    // Check if the user is the owner
    if (novel.author.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized to edit this novel" });
    }

    // Prepare update object
    const updateData = {
      title: req.body.title || novel.title,
      description: req.body.description || novel.description,
    };

    // Handle Genres (Parse if it comes as a string from FormData)
    if (req.body.genres) {
      updateData.genres = typeof req.body.genres === 'string' 
        ? JSON.parse(req.body.genres) 
        : req.body.genres;
    }

    // Handle Chapters (If you sent the updated chapter list)
    if (req.body.chapters) {
      updateData.chapters = typeof req.body.chapters === 'string' 
        ? JSON.parse(req.body.chapters) 
        : req.body.chapters;
    }

    // Handle Image Upload
    if (req.file) {
      updateData.coverImage = req.file.path; // Or req.file.filename depending on storage
    }

    const updatedNovel = await Novel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedNovel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- DELETE NOVEL ---------------- */
export const deleteNovel = async (req, res) => {
  try {
    const novel = await Novel.findById(req.params.id);
    if (!novel) return res.status(404).json({ message: "Novel not found" });

    if (novel.author.toString() !== req.user.id.toString())
      return res.status(403).json({ message: "Unauthorized" });

    const title = novel.title;
    const novelId = novel._id;

    await novel.deleteOne();

    createActivity({
      userId: req.user.id,
      actionType: "DELETE_NOVEL",
      targetType: "NOVEL",
      targetId: novelId,
      meta: { novelTitle: title },
    });
    res.status(200).json({ message: "Novel deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- TOGGLE PUBLISH ---------------- */
export const togglePublish = async (req, res) => {
  try {
    const novel = await Novel.findById(req.params.id);
    if (!novel) return res.status(404).json({ message: "Novel not found" });

    if (novel.author.toString() !== req.user.id.toString())
      return res.status(403).json({ message: "Unauthorized" });

    novel.isPublished = !novel.isPublished;
    await novel.save();

    res.status(200).json({
      isPublished: novel.isPublished,
      message: novel.isPublished ? "Published" : "Unpublished",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Rate a novel
// @route   POST /api/novels/:id/rate
// @access  Privateexport const rateNovel = async (req, res) => {
export const rateNovel = async (req, res) => {
  const { id } = req.params; // Novel ID
  const { rating } = req.body;
  const userId = req.user.id;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Please provide a rating between 1 and 5" });
  }

  try {
    // 1. Update or Create the review in the Review collection
    await Review.findOneAndUpdate(
      { novelId: id, userId: userId },
      { rating: rating },
      { upsert: true, new: true }
    );

    // 2. Calculate the new average using Aggregation
    const stats = await Review.aggregate([
      { $match: { novelId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: "$novelId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    const averageRating = stats.length > 0 ? stats[0].averageRating.toFixed(1) : 0;
    const reviewCount = stats.length > 0 ? stats[0].totalReviews : 0;

    // 3. Update the Novel document with the new stats
    const updatedNovel = await Novel.findByIdAndUpdate(
      id,
      { 
        rating: averageRating,
      },
      { new: true }
    );

    if (!updatedNovel) {
      return res.status(404).json({ message: "Novel not found" });
    }

    res.status(200).json({ 
      message: "Rating synchronized", 
      averageRating: updatedNovel.rating,
      reviewCount: updatedNovel.reviewCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const unlockSingleNovel = async (req, res) => {
  try {
    // 1. Fetch Data - Ensure novelId matches your route parameter
    const { novelId } = req.params;
    const novelCost = 2000; 

    const novel = await Novel.findById(novelId).populate('author');
    if (!novel) return res.status(404).json({ message: "Novel not found." });

    const userId = req.user.id;
    // Populate wallet to access balance
    const user = await User.findById(userId).populate('wallet');
    
    if (!user ) {
      return res.status(404).json({ message: "User or Wallet not found." });
    }
    let userWallet = user.wallet;
    if (!userWallet) {// Ensure Wallet model is loaded
      userWallet = await Wallet.find({user:req.user.id});
      // Link the new wallet to the user document
      user.wallet = userWallet._id;
      await user.save();
    }

    // 2. Access Check - Using 'unlockedNovels' to match User Schema
    const alreadyUnlocked = user.unlockedNovels.some(
      (id) => id.toString() === novelId.toString()
    );

    if (alreadyUnlocked) {
      return res.status(400).json({ message: "Novel already in your library." });
    }

    // 3. Calculation & Discount Logic
    // logic: isPremium ? (40% of cost) : full cost
    const isPremium = user.subscription.plan !== "free"; 
    const finalCost = isPremium ? (novelCost * 0.4) : novelCost;

    if (user.wallet.balance < finalCost) {
      return res.status(403).json({ message: "Insufficient NestCoins." });
    }

    // 4. THE TRANSACTION LOGIC
    user.wallet.balance -= finalCost;
    user.wallet.totalSpent += finalCost;
    user.unlockedNovels.push(novelId); // Fixed field name

    // Create Transaction record for audit trail
    await Transaction.create({
      wallet: user.wallet._id,
      user: userId,
      amount: -finalCost, 
      type: 'withdrawal', 
      status: 'completed',
      balanceAfter: user.wallet.balance,
      description: `Unlocked Full Novel: ${novel.title}`
    });

    // 5. Persistence
    await Promise.all([
      user.wallet.save(),
      user.save()
    ]);

    // 6. Background Tasks (Cleaned up 'chapter' references)
    await logActivity({
      userId: userId,
      actionType: "BOUGHT_NOVEL",
      targetType: "PURCHASE",
      targetId: novelId,
      meta: { novelTitle: novel.title },
    });

    // Pay author 70% of the price
    const paymentSuccess = await logPayAuthor({ novel, Price: finalCost });

    if (paymentSuccess) {
      const authorId = novel.author._id || novel.author;
      await Promise.all([
        Notification.create({
          recipient: authorId,
          sender: user._id,
          type: "EARNING",
          message: `You earned coins from a full novel purchase: ${novel.title}`,
          data: { novelId }
        }),
        logNotification({
          recipient: authorId,
          sender: user._id,
          type: "EARNING",
          novelId: novel._id
        })
      ]);
    }

    console.log("novel unlocked succesfully");
    res.status(200).json({ 
      message: "Novel Unlocked Successfully.",
      remainingBalance: user.wallet.balance 
    });

  } catch (e) {
    console.error("Unlock Error:", e.message);
    res.status(500).json({ message: "Error during unlock process." });
  }
};