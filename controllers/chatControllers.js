import asyncHandler from "express-async-handler";
import { decodeJWT, generateJWT } from '../utils/manageVisitors.js';
import ChatRoom from '../models/chatRoomModels.js';


//@desc Route to create a new chat room with the visitor
//@route GET /chat/new-room
//@access PRIVATE
const createChatRoom = asyncHandler(async(req,res,next) => {
    try{
        // get the user hash
        const { u_hash } = req.body;
        // decode the cookie and validate the JWT
        // const cookie_value = req.cookies
        const cookie_value = req.headers.authorization.split(' ')[1]

        const decoded = await decodeJWT(cookie_value, 'Visitor');
        // add a new chat room to the chat collection array
        const user_chatroom = await ChatRoom.findById(u_hash);
        if(!user_chatroom){
            res.status(500);
            throw new Error("No chatroom found with the given user access ID")
        }
        // create a new chat for the array with the visitor
        const newChat = {
            visitor: decoded.id
        }
        // add it to the array
        const add_newroom = await user_chatroom.updateOne({
            $push: {
                chat_rooms: newChat
            }
        });
        if(add_newroom){
            res.status(201).json({ message: "New room created" });
        } else {
            res.status(500);
            throw new Error('Unable to start a new chat, please try again...')
        }
        // ask for email
    } catch(err){
        console.log(err)
        res.status(500)
        next(err)
    }
});

//@desc Route to initiate the Chat using Socket.io
//@route POST /chat/auth-ws
//@access PRIVATE
const AuthForWS = asyncHandler(async(req,res,next) => {
    try{
        // receive the user hash
        const { user_hash } = req.body
        // decode the cookie and validate the JWT
        // const cookie_value = req.cookies
        const cookie_value = req.headers.authorization.split(' ')[1]
        const decoded = await decodeJWT(cookie_value, 'Visitor');
        // add a new chat room to the chat collection array
        const user_chatroom = await ChatRoom.findById(user_hash);
        if(decoded && user_chatroom){
            // -> create another JWT with both the hash and id from the jwt and return it
            const ws_JWT = await generateJWT(decoded.id, user_hash);
            if(ws_JWT){
                const deco = await decodeJWT(ws_JWT.jwtToken, 'WS')
                if(deco){
                    res.status(201).json({ wss_connection: ws_JWT.jwtToken });
                }
                
            } else {
                res.status(500);
                throw new Error("Unable to generate a new jwt for WS connection...please try again")
            }
        }
    } catch(err){
        res.status(500)
        next(err)
    }
});

//@desc Route to send new chat
//@route POST /chat/send
//@access PUBLIC
const sendChat = asyncHandler(async(req,res,next) => {
    try{
        // get the right room
        const { user_hash, visitor_id } = req.body
        // find the room
        // find the specific object and add push it inside the messages array
    } catch(err){
        res.status(500);
        next(err)
    }
});

//@desc Route to delete selected Chat
//@route DELETE /chat/delete-chat
//@access PUBLIC
const deleteChat = asyncHandler(async(req,res,next) => {
    try{
        // find the chatroom
        // find the chat in the array
        // remove it and send back success message
    } catch(err){
        res.status(500);
        next(err);
    }
});


export { createChatRoom, sendChat, deleteChat, AuthForWS }