import express from 'express';
import { shopifyCallback } from '../controllers/shopifyControllers.js';

const router = express.Router();

router.get('/callback', shopifyCallback);

export default router