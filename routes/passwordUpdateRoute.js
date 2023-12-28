import express from 'express';
import { RequestSentLimitCheck } from '../controllers/passwordUpdateControllers.js';

const router = express.Router();

router.post('/request-limit', RequestSentLimitCheck);


export default router;