import express from 'express';
import { createChatRoom, AuthForWS } from '../controllers/chatControllers.js';

const router = express.Router();

router.post('/new-room', createChatRoom);

router.post('/auth-ws', AuthForWS);
export default router

/**
 * Chechlist
 */
/**
 * -> One route to create a new chat room once the owner/user of the salezy widget accepts to chat ( * clicks the button )
 *      Will also create a new WebSocket connection to allow bi-directionnal connection
 * -> One route to send a new chat
 * -> One route to delete the chat
 * -> One route to fetch all the chat back up again ( * to maintain the state of the chatroom )
 */