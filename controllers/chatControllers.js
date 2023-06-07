import asyncHandler from "express-async-handler";
import { decodeJWT } from '../utils/manageVisitors.js';
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
        const decoded = await decodeJWT(cookie_value);
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
//@route POST /chat/initiate-chat
//@access PRIVATE
const initiateChat = asyncHandler(async(req,res,next) => {
    try{
        // get both the current visitor id and owner of the widget hash
        // find the chat room in the chat collection of the user
        // send back every sent chat
        // start WebSocket connection
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
        // add the new chat
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


export { createChatRoom, sendChat, deleteChat, initiateChat }