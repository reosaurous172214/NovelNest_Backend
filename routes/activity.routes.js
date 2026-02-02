import express from 'express';
import {
    getUserActivities,
    getReadingTime
} from '../controllers/activity.controller.js';
import  protect  from '../middleware/authMiddleware.js';
const router = express.Router();

// Get Activities for the specified User
router.get('/', protect, getUserActivities);

// Get Reading Time for the authenticated user
router.get('/time',protect, getReadingTime)

//export the router
export default router;
