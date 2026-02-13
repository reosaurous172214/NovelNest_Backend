import mongoose from "mongoose";
import Novel from "./models/Novel.js"; // Adjust paths to your models
import Chapter from "./models/Chapter.js";
import dotenv from "dotenv";

dotenv.config();

const syncTotalChapters = async () => {
  try {
    // 1. Connect to Database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to database for synchronization...");

    // 2. Fetch all novels
    const novels = await Novel.find({});
    console.log(`Found ${novels.length} novels. Starting sync...`);
    var cnt = 0;
    for (let novel of novels) {
      // 3. Count real chapters for this novel
      cnt++;
      if(novel.totalChapters === 0)continue;
      const actualCount = await Chapter.countDocuments({ novelId: novel._id });

      // 4. Update the novel if the count is different
      if (novel.totalChapters !== actualCount) {
        novel.totalChapters = actualCount;
        await novel.save();
        console.log(`Updated ${cnt}.[${novel.title}]: ${actualCount} chapters.`);
      } else {
        console.log(`Skipped ${cnt}.[${novel.title}]: Count already matches.`);
      }
    }

    console.log("Synchronization complete.");
    process.exit(0);
  } catch (error) {
    console.error("Sync failed:", error.message);
    process.exit(1);
  }
};

syncTotalChapters();