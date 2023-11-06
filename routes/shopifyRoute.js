import express from 'express';
import { shopifyAuth, shopifyCallback, shopifyAdminID } from '../controllers/shopifyControllers.js';

const router = express.Router();

router.post('/auth', shopifyAuth);

router.post('/widget-id', shopifyAdminID);

export default router