import { novelSearchTrie } from "../services/search.service.js";
import Novel from "../models/Novel.js";

// @desc    Get live search suggestions from Trie
// @route   GET /api/search/suggest
export const getSuggestions = async (req, res) => {
    try {
        const { q } = req.query;

        // Don't search for very short strings to save resources
        if (!q || q.length < 2) {
            return res.status(200).json([]);
        }

        const results = novelSearchTrie.suggest(q);
        
        // Return results (The Trie already has id, title, and cover stored)
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ message: "Search service error" });
    }
};

// @desc    Clear and rebuild the Trie from Database
// @route   POST /api/search/reindex
export const rebuildSearchIndex = async (req, res) => {
    try {
        const novels = await Novel.find({}, "title _id coverImage");
        
        // Assuming your Trie service has a reset method
        novelSearchTrie.reset(); 
        
        novels.forEach(n => {
            novelSearchTrie.insert(n.title, { 
                id: n._id, 
                title: n.title, 
                cover: n.coverImage 
            });
        });

        res.status(200).json({ message: "Search index rebuilt successfully" });
    } catch (error) {
        res.status(500).json({ message: "Reindexing failed" });
    }
};