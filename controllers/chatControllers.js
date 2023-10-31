import asyncHandler from "express-async-handler";
import { decodeJWT, generateJWT } from '../utils/manageVisitors.js';
import ChatRoom from '../models/chatRoomModels.js';
import Visitor from '../models/visitorsModels.js';
import { redis_chatroom } from '../server.js';
import { VerifyFirebaseToken, VerifyWidgetToken } from "../middleware/authHandle.js";
let custom_statusCode;
let custom_err_message;
let custom_err_title;

//@desc Route to create a new chat room with the visitor
//@route GET /chat/new-room
//@access PRIVATE
const createChatRoom = asyncHandler(async(req,res,next) => { 
    try{
        // verify the user hash
        const verify = await VerifyWidgetToken(req,res);
        if(!verify){
            return;
        }
        // get the user hash
        const { user_hash } = req.body;
        // decode the cookie and validate the JWT
        // TODO: uncomment for production
        // const cookie_value = req.cookies
        const cookie_value = req.headers.authorization.split(' ')[1]
        const decoded = await decodeJWT(cookie_value, 'Visitor');
        if(!decoded){
            custom_statusCode = 400;
            custom_err_message = 'Invalid token';
            custom_err_title = 'VALIDATION ERROR';
        }
        // fetch the chatroom collection
        const chatroom_collection = await ChatRoom.findById(user_hash);
        if(!chatroom_collection){
            custom_statusCode = 404;
            custom_err_message = 'Chatroom data not found';
            custom_err_title = 'NOT FOUND';
        }
        // add it to the array and cache it
        const [add_chatroom, cache_chatroom] = await Promise.all([
            chatroom_collection.updateOne({
                $push: {
                    chat_rooms: {
                        $each: [
                            {
                                visitor: decoded.id
                            }
                        ],
                        $position: 0
                    }
                }
            }),
            redis_chatroom.set(decoded.id, JSON.stringify({ visitor: decoded.id, messages: [] }), "EX", 3600)
        ])
        if(!add_chatroom || !cache_chatroom){
            switch (!add_chatroom || !cache_chatroom){
                case !add_chatroom:
                    custom_statusCode = 500;
                    custom_err_message = 'Unable to create a new chatroom';
                    custom_err_title = 'SERVER ERROR';
                    break;
                case !cache_chatroom:
                    custom_statusCode = 500;
                    custom_err_message = 'Unable to cache the new chatroom';
                    custom_err_title = 'SERVER ERROR';
                    break;
                default:
                    break;
            }
        }
        res.status(201).json({ message: "New room created" });
    } catch(err){
        next({ 
            statusCode: custom_statusCode || 500, 
            title: custom_err_title || 'SERVER ERROR', 
            message: custom_err_message, 
            stack: err.stack 
        });
    }
});
//@desc Route to initiate the Chat for the Visitor
//@route POST /chat/auth-ws
//@access PRIVATE
const authForWS = asyncHandler(async(req,res,next) => {
    try{
        // verify the user hash
        const verify = await VerifyWidgetToken(req,res);
        if(!verify){
            return;
        }
        // receive the user hash
        const { user_hash } = req.body
        // make sure the visitor still exist or isnt closed by amdin
        const visitor_collection = await Visitor.findById(user_hash);
        if(!visitor_collection){
            custom_statusCode = 404;
            custom_err_message = 'Visitor data not found';
            custom_err_title = 'NOT FOUND';
        } 
        // verify if the visitor exist before doing anything
        const verify_visitor = visitor_collection.visitor.findIndex(visitor => visitor._id.toString() === verify.id.toString())
        if(verify_visitor === -1){
            res.send({ visitor_not_found: true });
            return;
        }
        // create another JWT with both the hash and id from the jwt and return it
        const ws_jwt = generateJWT(verify.id, user_hash, verify.id);
        if(ws_jwt.error){
            custom_statusCode = 500;
            custom_err_message = 'Unable to generate a token for a websocket connection';
            custom_err_title = 'SERVER ERROR';
            throw new Error(`${ws_jwt.error_msg}`);
        }
        // verify the newly created JWT before sending it to the front-end
        const verify_ws_jwt = await decodeJWT(ws_jwt.jwtToken, 'WS');
        if(!verify_ws_jwt){
            custom_statusCode = 400;
            custom_err_message = 'websocket connection token invalid';
            custom_err_title = 'VALIDATION ERROR';
            throw new Error();
        }
        res.status(201).json({ wss_connection: ws_jwt.jwtToken });
    } catch(err){
        next({ 
            statusCode: custom_statusCode || 500, 
            title: custom_err_title || 'SERVER ERROR', 
            message: custom_err_message, 
            stack: err.stack 
        });
    }
});
//@desc Route to give access to authenticated user the WS connection
//@route POST /chat/user-auth-ws
//@access PRIVATE
const userAuthWS = asyncHandler(async(req,res,next) => {
    try{    
        // verify firebase auth token
        await VerifyFirebaseToken(req, res);   
        // get both the user and visitor id from the Req
        const { visitor_id, user_hash } = req.body.data
        const ws_token = generateJWT(visitor_id, user_hash, user_hash);
        if(ws_token.error){
            custom_statusCode = 500;
            custom_err_message = 'Unable to generate a new token';
            custom_err_title = 'SERVER ERROR';
            throw new Error(`${ws_token.error_msg}`);
        }
        // send back the JWT token
        res.status(201).send({ wss_jwt: ws_token.jwtToken});
    } catch(err){
        next({ 
            statusCode: custom_statusCode || 500, 
            title: custom_err_title || 'SERVER ERROR', 
            message: custom_err_message, 
            stack: err.stack 
        });
    }
}); 

export { createChatRoom, authForWS, userAuthWS }