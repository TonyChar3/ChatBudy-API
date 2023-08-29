import asyncHandler from "express-async-handler";
import { decodeJWT, generateJWT } from '../utils/manageVisitors.js';
import { sendUpdateToUser } from "./sseControllers.js";
import ChatRoom from '../models/chatRoomModels.js';
import User from '../models/userModels.js';
import Visitor from '../models/visitorsModels.js';
import admin from 'firebase-admin';
import { redis_chatroom } from '../server.js';


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
        const new_room = {
            visitor: decoded.id
        }
        // add it to the array
        const add_newroom = await user_chatroom.updateOne({
            $push: {
                chat_rooms: new_room
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
        res.status(500)
        next(err)
    }
});

//@desc Route to initiate the Chat for the Visitor
//@route POST /chat/auth-ws
//@access PRIVATE
const AuthForWS = asyncHandler(async(req,res,next) => {
    try{
        // receive the user hash
        const { user_hash } = req.body
        // decode the cookie and validate the JWT
        //TODO: Uncomment this for production to use httpOnly cookies
        // const cookie_value = req.cookies
        const cookie_value = req.headers.authorization.split(' ')[1]
        const decoded = await decodeJWT(cookie_value, 'Visitor');
        // make sure the visitor still exist or isnt closed by amdin
        const visitor_collection = await Visitor.findById(user_hash);
        if(!visitor_collection){
            res.status(404);
            throw new Error('Unable to find the visitor collection of the admin.')
        } 
        const verify_visitor = visitor_collection.visitor.find(visitor => visitor._id.toString() === decoded.id.toString())
        if(!verify_visitor){
            res.send({ visitor_not_found: true })
        } else if(verify_visitor) {
            // add a new chat room to the chat collection array
            const user_chatroom = await ChatRoom.findById(user_hash);
            if(decoded && user_chatroom){
                // -> create another JWT with both the hash and id from the jwt and return it
                const ws_JWT = await generateJWT(decoded.id, user_hash, decoded.id);
                if(ws_JWT){
                    const deco = await decodeJWT(ws_JWT.jwtToken, 'WS');
                    if(deco){
                        res.status(201).json({ wss_connection: ws_JWT.jwtToken });
                    }
                } else {
                    res.status(500);
                    throw new Error("Unable to generate a new jwt for WS connection...please try again")
                }
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
            const ws_token = await generateJWT(visitor_id, user_hash, user_hash)
            if(ws_token){
                res.status(201).send({ wss_jwt: ws_token.jwtToken})
            } else {
                res.status(500);
            }
        } else if(!verify_token){
            // return error FORBIDDEN
            res.status(403);
        }
    } catch(err){
        next(err)
    }
}); 

//@desc Route to close the selected client
//@route POST /chat/close-client
//@access PRIVATE
const closeClient = asyncHandler(async(req,res,next) => {
    try{
        // get the visitor id from the body
        const { visitr_id } = req.body.data
        // get the verification firebase token
        const token = req.headers.authorization.split(" ")[1]
        // validate and decode the token
        const decodedToken = await admin.auth().verifyIdToken(token)
        // verify it
        if(!decodedToken){
            res.status(403);
        }
        // get the user
        const current_user = await User.findById(decodedToken.uid)
        if(!current_user){
            res.status(404);
            throw new Error('Error closing client. Unable to find client.')
        }
        // get the visitor array
        const visitor_collection = await Visitor.findById(current_user.user_access)
        if(!visitor_collection){
            res.status(404);
            throw new Error('Error closing client. Unable to find the user visitor collection.')
        }
        // get the chatroom array
        const chatroom_collection = await ChatRoom.findById(current_user.user_access)
        if(!chatroom_collection){
            res.status(404);
            throw new Error('Error closing client. Unable to find the user chatroom collection.')
        }
        // find the visitor with the received ID
        const closed_visitor = visitor_collection.visitor.find(visitor => visitor._id.toString() === visitr_id.toString())
        // find the chatroom
        const closed_visitor_chatroom = chatroom_collection.chat_rooms.find(rooms => rooms.visitor.toString() === visitr_id.toString())
        // add it to the closed array
        if (closed_visitor && closed_visitor_chatroom){
            // remove it from the visitor
            visitor_collection.visitor = visitor_collection.visitor.filter(visitor => visitor._id.toString() !== visitr_id.toString())
            // remove the chatroom
            chatroom_collection.chat_rooms = chatroom_collection.chat_rooms.filter(rooms => rooms.visitor.toString() !== visitr_id.toString())
            // add it to the closed array
            visitor_collection.closed.push(closed_visitor);
            // remove from the cache
            const remove_cache_room = redis_chatroom.del(visitr_id);
            // save the updates
            const save_chatroom = await chatroom_collection.save();
            const save_visitor = await visitor_collection.save();
            if(save_chatroom && save_visitor && remove_cache_room){
                sendUpdateToUser(decodedToken.uid, visitor_collection.visitor)
                res.status(200).send({ message: 'Visitor closed' });
            } else {
                res.status(500);
            }
        } else {
            res.status(500);
        }
    } catch(err){
        next(err)
    }
});


export { createChatRoom, AuthForWS, UserAuthWS, closeClient }