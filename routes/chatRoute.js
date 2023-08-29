import express from 'express';
import { createChatRoom, AuthForWS, UserAuthWS, closeClient } from '../controllers/chatControllers.js';

const router = express.Router();

router.post('/new-room', createChatRoom);

router.post('/auth-ws', AuthForWS);

router.post('/user-auth-ws', UserAuthWS);

router.post('/close-client', closeClient);
export default router