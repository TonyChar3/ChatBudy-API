import express from 'express';
import { shopifyAuth, shopifyCallback } from '../controllers/shopifyControllers.js';

const router = express.Router();

router.post('/auth', shopifyAuth);

router.get('/callback', shopifyCallback);

export default router