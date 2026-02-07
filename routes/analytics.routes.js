import {
    getAnalyticsSummary,
    syncHeartbeat
} from "../controllers/analytics.controller.js";
import express from "express"
const router = express.Router();
import protect from "../middleware/authMiddleware.js";
router.get("/summary",protect, getAnalyticsSummary);
router.post("/sync",protect, syncHeartbeat);
export default router;