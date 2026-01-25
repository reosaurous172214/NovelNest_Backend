import fs from 'fs';

const parseMobyDick = () => {
  const filePath = './mobydick.txt'; // Adjust to your Kaggle download path
  const rawText = fs.readFileSync(filePath, 'utf-8');

  // Regex to find "CHAPTER 1", "CHAPTER 2", etc.
  // This splits the text whenever it sees the word CHAPTER
  const chapterParts = rawText.split(/\nCHAPTER\s+/i);

  const chaptersPool = chapterParts
    .filter(part => part.trim().length > 0) // Remove empty chunks
    .map((part, index) => {
      const lines = part.trim().split('\n');
      const title = lines[0].trim(); // The first line after "CHAPTER" is usually the title
      const content = lines.slice(1).join('\n').trim(); // Everything else is content

      return {
        title: `Chapter ${index + 1}: ${title}`,
        content: content
      };
    });

  fs.writeFileSync('./chapters_pool.json', JSON.stringify(chaptersPool, null, 2));
  console.log(`Successfully extracted ${chaptersPool.length} chapters into pool.`);
};

parseMobyDick();