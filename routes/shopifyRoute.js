import express from 'express';
import { shopifyAuth, shopifyCallback, shopifyAdminID } from '../controllers/shopifyControllers.js';

const router = express.Router();

router.post('/auth', shopifyAuth);

router.get('/callback', shopifyCallback);

router.get('/widget-id', shopifyAdminID);

export default router