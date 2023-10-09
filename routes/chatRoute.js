import express from 'express';
import { createChatRoom, authForWS, userAuthWS } from '../controllers/chatControllers.js';

const router = express.Router();

router.post('/new-room', createChatRoom);

router.post('/auth-ws', authForWS);

router.post('/user-auth-ws', userAuthWS);

export default router