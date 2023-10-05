import express from 'express';
import { shopifytesting, shopifyCallback } from '../controllers/shopifyControllers.js';

const router = express.Router();

router.post('/auth', shopifytesting)
router.get('/callback', shopifyCallback)

export default router