import asyncHandler from 'express-async-handler';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { getVisitorBrowser, generateJWT, generateRandomID } from '../utils/manageVisitors.js';
import { sendNotification } from '../utils/manageChatRoom.js';
import Visitor from '../models/visitorsModels.js';
import Chatroom from '../models/chatRoomModels.js';
import User from '../models/userModels.js';
import { sendUpdateToUser } from '../controllers/sseControllers.js';

dotenv.config();

//@desc To get the visitor info
//@route GET /visitor/visitor-info
//@access PRIVATE
const visitorInfoFetch = asyncHandler( async(req,res,next) => {
    try {
        const api_key = process.env.GEO_KEY
        const response = await fetch(`https://api.geoapify.com/v1/ipinfo?&apiKey=${api_key}`)
        if(response) {
            const data =  await response.json()
            if(data) {
                res.json({ info: data })
            }
        } 
    } catch(err) {
        console.log(err)
    }
});

//@desc Route to create a new visitor
//@route POST /visitor/new-visitor
//@access PRIVATE
const createVisitor = asyncHandler(async(req,res,next) => {
    try{
        const { isoCode, browser } = req.body;
        const access_id = req.params.id
        
        const uid = generateRandomID(access_id);
        const visitor = await Visitor.findById(access_id);
        const visitor_browser = await getVisitorBrowser(browser);
       
        if( visitor && visitor_browser && uid) {
            const visitor_array = visitor.visitor
            const newVisitor = {
                _id: uid,
                country: isoCode,
                browser: visitor_browser.name
            }

            const add_visitor = await visitor.updateOne({
                $push: {
                    visitor: newVisitor
                }
            });

            if(add_visitor){
                // get the user uid
                const user = await User.findOne({ user_access: access_id })
                if(!user){
                    throw new Error("Create visitor ERROR: No user found for the visitor...")
                }
                visitor_array.push(newVisitor)
                // update SSE data
                sendUpdateToUser(user._id, visitor_array)
                // notify the user
                const notification_object ={
                    sent_from: "Admin",
                    title: "New visitor",
                    content: `${uid} is visiting`
                }
                sendNotification("admin", access_id, uid, notification_object)

                const generate_token = await generateJWT(uid)
                if(!generate_token){
                    res.status(500);
                    throw new Error('Unable to generate JWT for visitor...please try again')
                }
                // res.cookie('visitor_jwt', generate_token, { maxAge: 48 * 60 * 60 * 1000, httpOnly:false, sameSite: false })
                res.send({ visitorToken: generate_token });
            }
        }
    } catch(err) {
        console.log(err)
    }
});

//@desc Route to delete a specific visitor along with the chatroom
//@route DELETE /visitor/delete-visitor
//@access PRIVATE
const deleteVisitor = asyncHandler( async(req,res,next) => {
    try{
        // will need the user hash + the visitor _id
        const { u_hash, visitor_id } = req.body;

        const userUID = await User.findOne({ user_access: u_hash })
        // find the visitor object in the collection
        const user_visitors = await Visitor.findById(u_hash);
        // find the chatroom collection of the user
        const user_chatrooms = await Chatroom.findById(u_hash);
        if(!user_visitors || !userUID || !user_chatrooms){
            res.status(500);
        }
        // loop through the visitor array and check for the matching _id
        const visitor_index = user_visitors.visitor.findIndex(visitr => visitr._id.toString() === visitor_id.toString())
        //loop through his chatrooms to find the room
        const chatroom_index = user_chatrooms.chat_rooms.findIndex(rooms => rooms.visitor.toString() === visitor_id.toString())
        if(visitor_index !== -1 && chatroom_index !== -1){
            user_visitors.visitor.splice(visitor_index, 1);
            user_chatrooms.chat_rooms.splice(chatroom_index,1);

            const save_visitor = await user_visitors.save();
            const save_chatroom = await user_chatrooms.save();

            if(save_visitor && save_chatroom){
                sendUpdateToUser(userUID._id, user_visitors.visitor)
                res.status(200).json({ message: "Visitor removed" });
            }
            
        } else {
            res.status(404);
        }
    } catch(err){   
        next(err);
    }
});


export { visitorInfoFetch, createVisitor, deleteVisitor }