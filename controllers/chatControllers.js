import asyncHandler from "express-async-handler";
import { decodeJWT, generateJWT } from '../utils/manageVisitors.js';
import { verifyCache } from "../utils/manageChatRoom.js";
import ChatRoom from '../models/chatRoomModels.js';
import admin from 'firebase-admin';
import { redis_client } from "../server.js";


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

//@desc Route to give access to authenticated user the WS connection
//@route POST /chat/user-auth-ws
//@access PRIVATE
const UserAuthWS = asyncHandler(async(req,res,next) => {
    try{
        // get both the user and visitor id from the Req
        const { visitor_id, user_hash } = req.body.data
        // get the user accessToken
        const token = req.headers.authorization.split(' ')[1]
        // check it using Firebase admin
        const verify_token = admin.auth().verifyIdToken(token)
        if(verify_token){
            const ws_token = await generateJWT(visitor_id, user_hash)
            if(ws_token){
                res.status(201).send({ wss_jwt: ws_token.jwtToken})
            } else {
                res.status(500);
            }
        }
        // generate a JWT and send it back to the front-end
    } catch(err){
        console.log(err)
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

//@desc Route to fetch the active chatrooms
//@route POST /chat/fetch-active-rooms
//@access PRIVATE
const fetchActiveRooms = asyncHandler(async(req,res,next) => {
    try{
        // get the user hash from the req
        const { user_hash, chatroom_id } = req.body.data
        // verify the cache for the active rooms
        if(chatroom_id){
            const verify_cache = await verifyCache("User_chat", redis_client, chatroom_id)
            if(verify_cache){
                console.log("Cache")
                res.status(200).send({ room: JSON.parse(verify_cache) })
            } else if(!verify_cache){
                const fetch_room = await ChatRoom.findById(user_hash)
                if(fetch_room){
                    const room_index = fetch_room.chat_rooms.findIndex(rooms => rooms.visitor.toString() === chatroom_id.toString())
                    if(room_index !== -1){
                        const active_room = fetch_room.chat_rooms[room_index]
                        await redis_client.set(chatroom_id, JSON.stringify(active_room))
                        console.log("mongo")
                        res.status(200).send({ room: active_room })
                    } else {
                        res.status(404);
                    }
                }
            }
        }
    } catch(err){
        next(err)
    }
});


export { createChatRoom, sendChat, deleteChat, AuthForWS, fetchActiveRooms, UserAuthWS }