import express from 'express';
import { connectionSSE, authSSEconnection } from '../controllers/sseControllers.js';

const router = express.Router();

router.get('/auth-sse', authSSEconnection);

router.get('/sse', connectionSSE);

export default router