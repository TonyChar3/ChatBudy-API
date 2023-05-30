import express from 'express';
import { initializeWidget, widgetCustomLink } from '../controllers/widgetControllers.js';
import { VerifyToken } from '../middleware/authHandle.js';
const router = express.Router();

router.get('/link', VerifyToken, widgetCustomLink);

router.get('/:id', initializeWidget);

export default router;