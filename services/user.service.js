import User from "../models/User.js"
export const logHistory = async ({
userId,
novelId,
chapterNumber
})=>{
if (!novelId) {
            return res.status(400).json({ message: "Novel ID required" });
        }
        await User.updateOne(
            { _id: userId },
            { $pull: { history: { novel: novelId } } }
        );
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
                        $slice: 50 
                    }
                }
            },
            { new: true }
        );
}