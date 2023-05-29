import express from 'express';
import { initializeWidget } from '../controllers/widgetControllers.js';
import { VerifyToken } from '../middleware/authHandle.js';
const router = express.Router();

// router.use(VerifyToken);

router.get('/main.js', initializeWidget);

export default router;