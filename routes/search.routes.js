import express from "express";
import { getSuggestions, rebuildSearchIndex } from "../controllers/search.controllers.js";
// Optional: import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public route: This is what your frontend search bar calls
// URL: /api/search/suggest?q=dragon
router.get("/suggest", getSuggestions);

// Admin route: Manually refresh the Trie if needed 
// URL: /api/search/reindex
router.post("/reindex", rebuildSearchIndex); 

export default router;