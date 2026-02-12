import Chapter from "../models/Chapter.js";
import User from "../models/User.js";

export const logPayAuthor = async ({ chapter, Price }) => {
    try {

        if (!chapter || !chapter.novelId) {
            console.error("Chapter or Novel not found for ID:", chapterId);
            return false;
        }

        const author = await User.findById(chapter.novelId.author).populate("wallet");
        
        if (!author || !author.wallet) {
            console.error("Author or wallet not found for author ID:", chapter.novelId.author);
            return false;
        }

        const Earning = Price * 0.7;
        
        author.wallet.balance += Earning;
        author.wallet.totalEarned += Earning;

        await author.wallet.save();
        return true;
    } catch (e) {
        console.error("Error Paying Author:", e);
        throw e;
    }
}