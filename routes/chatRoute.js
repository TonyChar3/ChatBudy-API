import express from 'express';
import { decodeJWT } from '../utils/manageVisitors.js';

const router = express.Router();

router.get('/chat-room', async(req,res,next) => {
    try{
        const cookie_value = req.cookies.visitor_jwt.jwtToken
        const decoded = await decodeJWT(cookie_value);
        if(decoded){
            res.json({ message: `${decoded.id} wants to chat`})
        }
    } catch(err){
        next(err)
    }
});

export default router