import { createDeflate } from "zlib";
import Chapter from "../models/Chapter.js";
import Novel from "../models/Novel.js";

/* ---------------- CREATE CHAPTER ---------------- */
export const createChapter = async(req, res)=>{
    try{
        const {novelId,title, content} = req.body;

        const novel = await Novel.findById(novelId);
        if(!novel){
            return res.status(404).json({message: "Novel not found"});
        }
        if(novel.author.toString() !== req.user._id.toString()){
            return res.status(403).json({message: "Unauthorized"});
        }
        const newChapter = new Chapter({
            novelId,
            title,
            content,
        });
        await newChapter.save();
        res.status(201).json({message: "Chapter created", chapter: newChapter.title});
    }
    catch(error){
        res.status(500).json({message: error.message});
    }
};

/* ---------------- GET CHAPTERS BY NOVEL ---------------- */
export const getChapterByNovel = async (req, res) => {
    try {
        const { novelId } = req.params;
        
        const chapters = await Chapter.find({ novelId })
            .select("title chapterNumber") 
            .sort({ chapterNumber: 1 }) // Primary Sort
            .collation({ locale: "en", numericOrdering: true }) // Handles string-numbers
            .lean(); // Returns faster, plain JS objects

        res.status(200).json({ chapters });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
/* ---------------- GET SINGLE CHAPTER ---------------- */
export const getSingleChapter = async(req,res)=>{
    try{
        const {novelId,chapterNumber} = req.params;
        const chapter = await Chapter.findOne({ novelId, chapterNumber: Number(chapterNumber) });
        if(!chapter){
            return res.status(404).json({message: "Chapter not found"});
        }
        res.status(200).json({chapter});
    }
    catch(error){
        res.status(500).json({message: error.message});
    }
};

/* ---------------- UPDATE CHAPTER ---------------- */
export const updateChapter = async(req,res)=>{
    try{
        const chapterId = req.params.chapterId;
        const chapter = await Chapter.findById(chapterId);
        if(!chapter){
            return res.status(404).json({message: "Chapter not found"});
        }
        const novel = await Novel.findById(chapter.novelId);
        if(novel.author.toString() !== req.user._id.toString()){
            return res.status(403).json({message: "Unauthorized"});
        }
        const {title, content} = req.body;
        if(title) chapter.title = title;
        if(content) chapter.content = content;
        chapter.updatedAt = Date.now();
        await chapter.save();
        res.status(200).json({message: "Chapter updated", chapter});
    }   
    catch(error){
        res.status(500).json({message: error.message});
    }
};

/* ---------------- DELETE CHAPTER ---------------- */
export const deleteChapter = async(req,res)=>{
    try{
        const chapterId = req.params.chapterId;
        const chapter = await Chapter.findById(chapterId);
        if(!chapter){
            return res.status(404).json({message: "Chapter not found"});
        }
        const novel = await Novel.findById(chapter.novelId);
        if(novel.author.toString() !== req.user._id.toString()){
            return res.status(403).json({message: "Unauthorized"});
        }
        await Chapter.findByIdAndDelete(chapterId);
        res.status(200).json({message: "Chapter deleted"});
    }
    catch(error){
        res.status(500).json({message: error.message});
    }
};

/* ---------------- LISTENER FOR CHAPTER UPDATES ---------------- */
// This can be expanded based on application needs
