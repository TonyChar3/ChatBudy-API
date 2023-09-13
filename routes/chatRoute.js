import express from 'express';
import { createChatRoom, AuthForWS, UserAuthWS } from '../controllers/chatControllers.js';

const router = express.Router();

router.post('/new-room', createChatRoom);

router.post('/auth-ws', AuthForWS);

router.post('/user-auth-ws', UserAuthWS);

export default router