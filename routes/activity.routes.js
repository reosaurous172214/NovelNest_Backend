import express from 'express';
import {
  createActivity,
    getUserActivities,
    getReadingTime
} from '../controllers/activity.controller.js';
import  protect  from '../middleware/authMiddleware.js';
const router = express.Router();

router.get('/', protect, getUserActivities);
// Create a new activity
router.post('/', protect, createActivity);
// Get activities for the authenticated user
router.get('/time',protect, getReadingTime)
export default router;
