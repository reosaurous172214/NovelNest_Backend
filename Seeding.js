import mongoose from 'mongoose';
import fs from 'fs';
import Novel from './models/Novel.js';
import Chapter from './models/Chapter.js';

const rawChapters = JSON.parse(fs.readFileSync('./chapters_pool.json', 'utf-8'));

const seedInBatches = async () => {
  try {
    console.log("started");
    await mongoose.connect('mongodb+srv://xenonblaze_nh_owner:hOPA7W3GyF4PBcyK@c0.tgl4hkb.mongodb.net/NhubDb?appName=C0');
    console.log("Connected to Archive. Initializing Batch Sync...");

    // 1. Get all 100 novels
    const allNovels = await Novel.find({}).limit(100);
    const BATCH_SIZE = 25;

    // 2. Loop through novels in increments of 25
    for (let i = 0; i < allNovels.length; i += BATCH_SIZE) {
      const currentBatch = allNovels.slice(i, i + BATCH_SIZE);
      console.log(`--- Processing Batch: ${i / BATCH_SIZE + 1} (${currentBatch.length} novels) ---`);

      // 3. Process the current 25 novels in parallel
      await Promise.all(currentBatch.map(async (novel) => {
        const existingCount = await Chapter.countDocuments({ novelId: novel._id });
        const targetCount = Math.min(novel.totalChapters, 135);
        const toAdd = targetCount - existingCount;

        if (toAdd <= 0) return;

        const bulkOps = [];
        for (let j = 1; j <= toAdd; j++) {
          const chapterNum = existingCount + j;
          // Loop through the 135 Moby Dick chapters using modulo
          const template = rawChapters[(chapterNum - 1) % rawChapters.length];

          bulkOps.push({
            insertOne: {
              document: {
                novelId: novel._id,
                chapterNumber: Number(chapterNum),
                title: template.title,
                content: template.content,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            }
          });


          // Sub-batching: execute every 500 chapters within a novel
          if (bulkOps.length === 500) {
            await Chapter.bulkWrite(bulkOps);
            bulkOps.length = 0;
          }
        }

        if (bulkOps.length > 0) {
          await Chapter.bulkWrite(bulkOps);
        }
        console.log(`[SYNCED] ${novel.title} complete.`);
      }));

      console.log(`Batch ${i / BATCH_SIZE + 1} finalized.`);
    }

    console.log("--- Global Synchronization Successful ---");
    process.exit(0);
  } catch (err) {
    console.error("Critical Sync Error:", err);
    process.exit(1);
  }
};

seedInBatches();