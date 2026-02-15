/**
 * i
 * Handles author payments for digital content purchases.
 */
import mongoose from "mongoose";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";
export const logPayAuthor = async ({ novel, chapter, Price }) => {
    try {
        let authorId;
        let description = "";

        // 1. Extract Author ID safely
        if (chapter) {
            // Check if novelId is populated as an object or is just an ID
            authorId = chapter.novelId?.author?._id || chapter.novelId?.author || chapter.novelId;
            description = `Earnings from Chapter: ${chapter.title}`;
        } else if (novel) {
            // FIX: novel.author might be an object (if populated) or an ID string
            authorId = novel.author?._id || novel.author;
            description = `Earnings from Full Novel: ${novel.title}`;
        }

        // 2. Failsafe: If authorId is null/undefined, try to fetch it from the DB
        if (!authorId && novel?._id) {
            const doc = await mongoose.model("Novel").findById(novel._id).select("author");
            authorId = doc?.author;
        }

        if (!authorId) {
            console.error("Payment Error: Author ID could not be determined for novel:", novel?.title);
            return false;
        }

        // 3. Fetch Author and Wallet
        const author = await User.findById(authorId).populate("wallet");
        
        if (!author || !author.wallet) {
            console.error("Payment Error: Author or wallet not found for ID:", authorId);
            return false;
        }

        // 4. Revenue Share (70% to Author)
        const earning = Price * 0.7;
        author.wallet.balance += earning;
        author.wallet.totalEarned += earning;

        // 5. Save and Log Transaction
        await Promise.all([
            author.wallet.save(),
            Transaction.create({
                wallet: author.wallet._id,
                user: author._id,
                amount: earning,
                type: 'deposit',
                status: 'completed',
                balanceAfter: author.wallet.balance,
                description: description
            })
        ]);

        return true;
    } catch (e) {
        console.error("logPayAuthor Exception:", e.message);
        return false;
    }
};