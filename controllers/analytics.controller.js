import Analytics from "../models/Analytics.js";
import Novel from "../models/Novel.js";
import Activity from "../models/Activity.js";
import mongoose from "mongoose";

/* ---------------- SYNC HEARTBEAT ---------------- */
/**
 * Call this every 60 seconds from the frontend reader.
 * Increments daily minutes and novel-specific minutes.
 */
export const syncHeartbeat = async (req, res) => {
    const { novelId, wordsWritten = 0, chapterFinished = false } = req.body;
    const userId = req.user.id;
    const today = new Date().setUTCHours(0, 0, 0, 0);

    try {
        // Find today's record
        let analytics = await Analytics.findOne({ user: userId, date: today });

        if (!analytics) {
            // Create new entry for a new day
            analytics = new Analytics({
                user: userId,
                date: today,
                readingMinutes: 1,
                wordsWritten,
                novelsRead: novelId ? [{ 
                    novelId, 
                    minutes: 1, 
                    chaptersFinished: chapterFinished ? 1 : 0 
                }] : []
            });
        } else {
            // Increment global stats
            analytics.readingMinutes += 1;
            analytics.wordsWritten += (wordsWritten || 0);

            if (novelId) {
                // Find if this novel is already in today's array
                const novelIndex = analytics.novelsRead.findIndex(
                    n => n.novelId.toString() === novelId.toString()
                );

                if (novelIndex > -1) {
                    analytics.novelsRead[novelIndex].minutes += 1;
                    if (chapterFinished) analytics.novelsRead[novelIndex].chaptersFinished += 1;
                } else {
                    analytics.novelsRead.push({ 
                        novelId, 
                        minutes: 1, 
                        chaptersFinished: chapterFinished ? 1 : 0 
                    });
                }
            }
        }

        await analytics.save();
        res.status(200).json({ status: "synced", readingMinutes: analytics.readingMinutes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/* ---------------- GET ANALYTICS SUMMARY ---------------- */
/**
 * Fetches data for the Analytics Tab charts (last 7 days).
 */
export const getAnalyticsSummary = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        
        // 1. Fetch last 7 days of heartbeat data
        const history = await Analytics.find({ user: userId })
            .sort({ date: -1 })
            .limit(7)
            .populate('novelsRead.novelId', 'title coverImage')
            .lean();

        // 2. Aggregate Lifetime Stats
        const lifetime = await Analytics.aggregate([
            { $match: { user: userId } },
            {
                $group: {
                    _id: null,
                    totalMinutes: { $sum: "$readingMinutes" },
                    totalWords: { $sum: "$wordsWritten" },
                    totalChapters: { $sum: { $sum: "$novelsRead.chaptersFinished" } },
                    daysActive: { $count: {} }
                }
            }
        ]);

        // 3. Get Novel Totals (Books Read & Published)
        const [published, favorites, readCount] = await Promise.all([
            Novel.countDocuments({ author: userId }),
            Novel.countDocuments({ favoritedBy: userId }),
            Activity.distinct("meta.novelId", { userId, actionType: "READ_CHAPTER" })
        ]);

        const stats = lifetime[0] || { totalMinutes: 0, totalWords: 0, totalChapters: 0, daysActive: 0 };

        res.status(200).json({
            history: history.reverse(), // For chronological chart rendering
            metrics: {
                booksRead: readCount.length,
                published,
                favorites,
                totalHours: (stats.totalMinutes / 60).toFixed(1),
                totalWords: stats.totalWords,
                totalChapters: stats.totalChapters,
                daysActive: stats.daysActive
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};