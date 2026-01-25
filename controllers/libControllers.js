import User from "../models/User.js";

/* ===========================
   USER HISTORY CONTROLLERS
=========================== */

// GET user history
export const getUserHistory = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate("history.novel");

        res.status(200).json(user.history);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch history" });
    }
};

// ADD to history

export const addToUserHistory = async (req, res) => {
    try {
        const { novelId, chapterNumber } = req.params;
        const userId = req.user.id || req.user._id;

        if (!novelId) {
            return res.status(400).json({ message: "Novel ID required" });
        }

        // 1. Remove existing entry for this novel to prevent duplicates
        await User.updateOne(
            { _id: userId },
            { $pull: { history: { novel: novelId } } }
        );

        // 2. Atomic push to the front of the array with a limit (slice)
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $push: {
                    history: {
                        $each: [{
                            novel: novelId,
                            lastReadChapter: parseInt(chapterNumber),
                            viewedAt: new Date()
                        }],
                        $position: 0,
                        $slice: 50 // Optimization: Keep history manageable
                    }
                }
            },
            { new: true }
        );

        res.status(200).json({ 
            message: "Archive history synchronized", 
            lastRead: chapterNumber 
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to update archive history" });
    }
};
// REMOVE single history item
export const removeFromUserHistory = async (req, res) => {
    try {
        const { novelId } = req.params;

        const user = await User.findById(req.user.id);

        user.history = user.history.filter(
            (item) => item.novel.toString() !== novelId
        );

        await user.save();

        res.status(200).json({ message: "Removed from history" });
    } catch (error) {
        res.status(500).json({ message: "Failed to remove history item" });
    }
};

// CLEAR history
export const clearUserHistory = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.history = [];
        await user.save();

        res.status(200).json({ message: "History cleared" });
    } catch (error) {
        res.status(500).json({ message: "Failed to clear history" });
    }
};

/* ===========================
   USER FAVOURITES CONTROLLERS
=========================== */

export const getUserFavourites = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate("favourites.novel");

        res.status(200).json(user.favourites);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch favourites" });
    }
};

export const addToUserFavourites = async (req, res) => {
    try {
        const { novelId } = req.body;

        if (!novelId) {
            return res.status(400).json({ message: "Novel ID required" });
        }

        const user = await User.findById(req.user.id);

        const exists = user.favourites.some(
            (item) => item.novel.toString() === novelId
        );

        if (exists) {
            return res.status(409).json({ message: "Already in favourites" });
        }

        user.favourites.push({
            novel: novelId,
            addedAt: new Date()
        });

        await user.save();

        res.status(201).json({ message: "Added to favourites" });
    } catch (error) {
        res.status(500).json({ message: "Failed to add favourite" });
    }
};

export const removeFromUserFavourites = async (req, res) => {
    try {
        const { novelId } = req.params;

        const user = await User.findById(req.user.id);

        user.favourites = user.favourites.filter(
            (item) => item.novel.toString() !== novelId
        );

        await user.save();

        res.status(200).json({ message: "Removed from favourites" });
    } catch (error) {
        res.status(500).json({ message: "Failed to remove favourite" });
    }
};

export const clearUserFavourites = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.favourites = [];
        await user.save();

        res.status(200).json({ message: "Favourites cleared" });
    } catch (error) {
        res.status(500).json({ message: "Failed to clear favourites" });
    }
};

/* ===========================
   USER BOOKMARK CONTROLLERS
=========================== */

export const getUserBookmarks = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate("bookmarks.novel");

        res.status(200).json(user.bookmarks);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch bookmarks" });
    }
};

export const addToUserBookmarks = async (req, res) => {
    try {
        const { novelId } = req.body;

        if (!novelId) {
            return res.status(400).json({ message: "Novel ID required" });
        }

        const user = await User.findById(req.user.id);

        const exists = user.bookmarks.some(
            (item) => item.novel.toString() === novelId
        );

        if (exists) {
            return res.status(409).json({ message: "Already bookmarked" });
        }

        user.bookmarks.push({
            novel: novelId,
            addedAt: new Date()
        });

        await user.save();

        res.status(201).json({ message: "Added to bookmarks" });
    } catch (error) {
        res.status(500).json({ message: "Failed to add bookmark" });
    }
};

export const removeFromUserBookmarks = async (req, res) => {
    try {
        const { novelId } = req.params;

        const user = await User.findById(req.user.id);

        user.bookmarks = user.bookmarks.filter(
            (item) => item.novel.toString() !== novelId
        );

        await user.save();

        res.status(200).json({ message: "Removed from bookmarks" });
    } catch (error) {
        res.status(500).json({ message: "Failed to remove bookmark" });
    }
};

export const clearUserBookmarks = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.bookmarks = [];
        await user.save();

        res.status(200).json({ message: "Bookmarks cleared" });
    } catch (error) {
        res.status(500).json({ message: "Failed to clear bookmarks" });
    }
};
