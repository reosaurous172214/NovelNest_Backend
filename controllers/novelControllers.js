import Novel from "../models/Novel.js";
import { logActivity } from "../services/activity.service.js";
import { novelSearchTrie } from "../services/search.service.js";


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
      author: novel.author?.username || "Unknown Author",
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
    const novel = await Novel.findById(req.params.id);
    if (!novel) return res.status(404).json({ message: "Novel not found" });

    // Authorization check using req.user.id
    if (novel.author.toString() !== req.user.id.toString())
      return res.status(403).json({ message: "Unauthorized" });

    const oldTitle = novel.title;
    const { title, description, incrementBy } = req.body;
    const genres = normalizeArray(req.body.genres);
    const tags = normalizeArray(req.body.tags);

    if (title) novel.title = title;
    if (description) novel.description = description;
    if (genres.length) novel.genres = genres;
    if (tags.length) novel.tags = tags;
    if (req.file) novel.coverImage = `/utilities/${req.file.filename}`;
    if (incrementBy !== undefined) novel.totalChapters += Number(incrementBy);

    await novel.save();

    // Re-index Trie if title was updated
    if (title && title !== oldTitle) {
      novelSearchTrie.insert(novel.title, {
        id: novel._id,
        title: novel.title,
        cover: novel.coverImage,
      });
    }

    await logActivity({
      userId: req.user.id,
      actionType: "UPDATE_NOVEL",
      targetType: "NOVEL",
      targetId: novel._id,
      meta: { novelTitle: novel.title },
    });
    res.status(200).json({ novel });
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