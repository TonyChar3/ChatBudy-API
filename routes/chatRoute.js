import express from 'express';
import { createChatRoom, AuthForWS } from '../controllers/chatControllers.js';

const router = express.Router();

router.post('/new-room', createChatRoom);

router.post('/auth-ws', AuthForWS);
export default router