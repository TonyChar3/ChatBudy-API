import express from 'express';
import { SSEconnection, AuthSSEconnection } from '../controllers/sseControllers.js';


const router = express.Router();

router.get('/auth-sse', AuthSSEconnection)

router.get('/sse', SSEconnection)

export default router