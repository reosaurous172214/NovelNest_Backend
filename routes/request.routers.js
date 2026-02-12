import express from "express";
import { createRequest } from "../controllers/request.controller.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Only logged-in users can submit requests
router.post("/", protect, createRequest);

export default router;