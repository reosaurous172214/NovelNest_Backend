import {
    getAnalyticsSummary,
    syncHeartbeat
} from "../controllers/analytics.controller.js";
import express from "express"
const router = express();
import protect from "../middleware/authMiddleware.js";
router.use(protect);
router.get("/summary",protect, getAnalyticsSummary);
router.post("/sync",protect, syncHeartbeat);
export default router;