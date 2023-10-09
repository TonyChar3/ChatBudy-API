import asyncHandler from "express-async-handler";
import { decodeJWT, generateJWT } from '../utils/manageVisitors.js';
import ChatRoom from '../models/chatRoomModels.js';
import Visitor from '../models/visitorsModels.js';
import { redis_chatroom } from '../server.js';
import { VerifyUserHash, VerifyFirebaseToken } from "../middleware/authHandle.js";

//@desc Route to create a new chat room with the visitor
//@route GET /chat/new-room
//@access PRIVATE
const createChatRoom = asyncHandler(async(req,res,next) => {
    // get the user hash
    const { u_hash } = req.body;
    try{
        // decode the cookie and validate the JWT
        // TODO: uncomment for production
        // const cookie_value = req.cookies
        const cookie_value = req.headers.authorization.split(' ')[1]
        const decoded = await decodeJWT(cookie_value, 'Visitor');
        if(!decoded){
            res.status(401);
            next();
        }
        // verify user hash
        const verify_user_hash = await VerifyUserHash(u_hash);
        if(!verify_user_hash){
            res.status(401);
            next();
        }
        // fetch the chatroom collection
        const chatroom_collection = await ChatRoom.findById(u_hash);
        if(!chatroom_collection){
            res.status(500);
            next();
        }
        // add it to the array
        const add_newroom = await chatroom_collection.updateOne({
            $push: {
                chat_rooms: {
                    visitor: decoded.id
                }
            }
        });
        // add it to the cache
        const cache_chatroom = await redis_chatroom.set(decoded.id, JSON.stringify({ visitor: decoded.id, messages: [] }), "EX", 3600); 
        if(!add_newroom || !cache_chatroom){
            res.status(500);
            next();
        }
        res.status(201).json({ message: "New room created" });
    } catch(err){
        console.log('ERROR createChatRoom()');
        next(err);
    }
});
//@desc Route to initiate the Chat for the Visitor
//@route POST /chat/auth-ws
//@access PRIVATE
const authForWS = asyncHandler(async(req,res,next) => {
    try{
        // receive the user hash
        const { user_hash } = req.body
        // decode the cookie and validate the JWT
        //TODO: Uncomment this for production to use httpOnly cookies
        // const cookie_value = req.cookies
        const cookie_value = req.headers.authorization.split(' ')[1]
        const decode_jwt = await decodeJWT(cookie_value, 'Visitor');
        // make sure the visitor still exist or isnt closed by amdin
        const visitor_collection = await Visitor.findById(user_hash);
        if(!visitor_collection){
            res.status(404);
            next();
        } 
        // verify if the visitor exist before doing anything
        const verify_visitor = visitor_collection.visitor.find(visitor => visitor._id.toString() === decode_jwt.id.toString())
        if(!verify_visitor){
            res.send({ visitor_not_found: true });
            return;
        }
        // create another JWT with both the hash and id from the jwt and return it
        const ws_jwt = generateJWT(decode_jwt.id, user_hash, decode_jwt.id);
        if(!ws_jwt){
            res.status(500);
            next();
        }
        // verify the newly created JWT before sending it to the front-end
        const verify_ws_jwt = await decodeJWT(ws_jwt.jwtToken, 'WS');
        if(!verify_ws_jwt){
            res.status(500);
            next();
        }
        res.status(201).json({ wss_connection: ws_jwt.jwtToken });
    } catch(err){
        console.log('ERROR authForWS()');
        next(err);
    }
});
//@desc Route to give access to authenticated user the WS connection
//@route POST /chat/user-auth-ws
//@access PRIVATE
const userAuthWS = asyncHandler(async(req,res,next) => {
    try{
        // get both the user and visitor id from the Req
        const { visitor_id, user_hash } = req.body.data
        // check it using Firebase admin
        const decode_token = await VerifyFirebaseToken(req, res);
        if(!decode_token){
            // return error FORBIDDEN
            res.status(403);
            next();
        }
        const ws_token = generateJWT(visitor_id, user_hash, user_hash);
        if(!ws_token){
            res.status(500);
            next();
        }
        // send back the JWT token
        res.status(201).send({ wss_jwt: ws_token.jwtToken});
    } catch(err){
        console.log('ERROR userAuthWS');
        next(err);
    }
}); 


export { createChatRoom, authForWS, userAuthWS }