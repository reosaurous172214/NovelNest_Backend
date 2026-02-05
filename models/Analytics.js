import mongoose from "mongoose";

const AnalyticsSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true 
    },
    // Normalized to YYYY-MM-DD at 00:00:00 UTC
    date: { 
        type: Date, 
        required: true,
        default: () => new Date().setUTCHours(0, 0, 0, 0),
        index: true 
    },
    readingMinutes: { 
        type: Number, 
        default: 0 
    },
    novelsRead: [{
        novelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Novel' },
        minutes: { type: Number, default: 0 },
        chaptersFinished: { type: Number, default: 0 }
    }],
    wordsWritten: { 
        type: Number, 
        default: 0 
    },
    sessionsCount: { 
        type: Number, 
        default: 1 
    }
}, { timestamps: true });

// Prevent duplicate entries for the same user on the same day
AnalyticsSchema.index({ user: 1, date: 1 }, { unique: true });

const Analytics = mongoose.model('Analytics', AnalyticsSchema);

// Export using ES Module syntax
export default Analytics;