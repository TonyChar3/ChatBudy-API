import asyncHandler from 'express-async-handler';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { getVisitorBrowser, generateJWT, generateRandomID, setBrowserData, setVisitorData } from '../utils/manageVisitors.js';
import { sendWsUserNotification } from '../utils/manageChatRoom.js';
import Visitor from '../models/visitorsModels.js';
import Chatroom from '../models/chatRoomModels.js';
import User from '../models/userModels.js';
import { sendAdminSSEInfo } from '../utils/manageSSE.js';
import { redis_chatroom } from '../server.js';

dotenv.config();

//@desc To get the visitor info
//@route GET /visitor/visitor-info
//@access PRIVATE
const visitorInfoFetch = asyncHandler( async(req,res,next) => {
    try {
        const api_key = process.env.GEO_KEY
        const response = await fetch(`https://api.geoapify.com/v1/ipinfo?&apiKey=${api_key}`);
        if(!response) {
            res.status(500);
        } 
        const data =  await response.json();
        res.json({ info: data });
    } catch(err) {
        console.log(err);
        next(err);
    }
});
//@desc Route to create a new visitor
//@route POST /visitor/new-visitor
//@access PRIVATE
const createVisitor = asyncHandler(async(req,res,next) => {
    try{
        const { isoCode, browser } = req.body;
        const user_hash = req.params.id
        
        const visitor_uid = generateRandomID(user_hash);
        const [visitor, visitor_browser, user] = await Promise.all([
            Visitor.findById(user_hash),
            getVisitorBrowser(browser),
            User.findOne({ user_access: user_hash })
        ]);
        if(!visitor || !visitor_browser || !visitor_uid || !user){
            res.status(500);
        }
        // increment visitorData count
        setVisitorData(visitor);
        // increment browserData count
        setBrowserData(visitor_browser.name, visitor);
        await visitor.save();
        // create a new visitor 
        const add_visitor = await visitor.updateOne({
            $push: {
                visitor: {
                    _id: visitor_uid,
                    country: isoCode,
                    browser: visitor_browser.name
                }
            }
        });
        if(!add_visitor){
            res.status(500);
            throw new Error('Unable to add new visitor to DB');
        }
        // push the new object to the array
        visitor.visitor.push({
            _id: visitor_uid,
            country: isoCode,
            browser: visitor_browser.name
        });
        // update SSE data
        sendAdminSSEInfo('visitor', user._id, visitor.visitor)
        // notify the user
        sendWsUserNotification("admin", user_hash, visitor_uid, { sent_from: "Admin", title: "New visitor", content: `${visitor_uid} is visiting` });

        const generate_token = generateJWT(visitor_uid);
        if(!generate_token){
            res.status(500);
            throw new Error('Unable to generate JWT for visitor...please try again')
        }
        // TODO: Uncomment this for production
        // res.cookie('visitor_jwt', generate_token, { maxAge: 48 * 60 * 60 * 1000, httpOnly:false, sameSite: false })
        res.send({ visitorToken: generate_token });
    } catch(err) {
        console.log(err);
        next(err);
    }
});
//@desc Route to delete a specific visitor along with the chatroom
//@route DELETE /visitor/delete-visitor
//@access PRIVATE
const deleteVisitor = asyncHandler( async(req,res,next) => {
    try{
        // will need the user hash + the visitor _id
        const { u_hash, visitor_id } = req.body;
        // find the user
        const user = await User.findOne({ user_access: u_hash });

        const [visitor_collection, chatroom_collection] = await Promise.all([
            //find the visitor collection
            await Visitor.findById(u_hash),
            // find the chatroom collection
            await Chatroom.findById(u_hash)
        ]);
        if(!visitor_collection || !user || !chatroom_collection){
            res.status(500);
        }
        // loop through the visitor array and check for the matching _id
        const visitor_index = visitor_collection.visitor.findIndex(visitr => visitr._id.toString() === visitor_id.toString());
        //loop through his chatrooms to find the room
        const chatroom_index = chatroom_collection.chat_rooms.findIndex(rooms => rooms.visitor.toString() === visitor_id.toString());
        if(visitor_index === -1 || chatroom_index === -1){
            res.status(404);
        }
        visitor_collection.visitor.splice(visitor_index, 1);
        chatroom_collection.chat_rooms.splice(chatroom_index,1);
        // save everything
        await Promise.all([
            await redis_chatroom.del(visitor_id),
            await visitor_collection.save(),
            await chatroom_collection.save()
        ]);
        sendAdminSSEInfo('visitor', user._id, visitor_collection.visitor);
        res.status(200).json({ message: "Visitor removed" });
    } catch(err){   
        next(err);
    }
});

export { visitorInfoFetch, createVisitor, deleteVisitor }