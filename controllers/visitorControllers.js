import asyncHandler from 'express-async-handler';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { getVisitorBrowser, generateJWT, generateRandomID, setBrowserData, setVisitorData } from '../utils/manageVisitors.js';
import { VerifyUserHash, VerifyWidgetToken, VerifyFirebaseToken } from '../middleware/authHandle.js';
import { sendWsUserNotification } from '../utils/manageChatRoom.js';
import Visitor from '../models/visitorsModels.js';
import Chatroom from '../models/chatRoomModels.js';
import User from '../models/userModels.js';
import Widget from '../models/widgetModels.js';
import { sendAdminSSEInfo } from '../utils/manageSSE.js';
import { redis_chatroom } from '../server.js';
import { send } from '../utils/manageVisitors.js';
import { redis_widget_tokens } from '../server.js';
import { uniqueUserHash } from '../utils/manageVisitors.js';
dotenv.config();
let custom_statusCode;
let custom_err_message;
let custom_err_title;
const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//@desc To get the visitor info
//@route GET /visitor/visitor-info
//@access PRIVATE
const visitorInfoFetch = asyncHandler( async(req,res,next) => {
    try {
        const api_key = process.env.GEO_KEY
        const response = await fetch(`https://api.geoapify.com/v1/ipinfo?&apiKey=${api_key}`);
        if(!response) {
            custom_statusCode = 404;
            custom_err_title = 'NOT FOUND';
            custom_err_message = 'Visitor info data not found';
        } 
        const data =  await response.json();
        res.json({ info: data });
    } catch(err) {
        next({ 
            statusCode: custom_statusCode || 500, 
            title: custom_err_title, 
            message: custom_err_message, 
            stack: err.stack 
        });
    }
});
//@desc Route to create a new visitor
//@route POST /visitor/new-visitor
//@access PRIVATE
const createVisitor = asyncHandler(async(req,res,next) => {
    try{
        // verify the user hash
        const verify = await VerifyUserHash(req,res);
        if(!verify){
            return;
        }
        const { user_hash } = req.params 
        const { isoCode, browser } = req.body;
        const visitor_hash = await uniqueUserHash();
        const visitor_uid = generateRandomID(user_hash);
        const visitor_browser = getVisitorBrowser(browser);
        const [visitor, user, widget] = await Promise.all([
            Visitor.findById(user_hash),
            User.findOne({ user_access: user_hash }),
            Widget.findById(user_hash)
        ]);
        // if one fails set an error message
        switch (!visitor || !visitor_browser || visitor_uid.error || !user || !widget){
            case !visitor:
                custom_statusCode = 404;
                custom_err_message = 'Visitor data not found';
                custom_err_title = 'NOT FOUND';
                break;
            case !visitor_browser:
                custom_statusCode = 404;
                custom_err_message = 'Visitor browser not set correctly';
                custom_err_title = 'NOT FOUND';
                break;
            case visitor_uid.error:
                custom_statusCode = 500;
                custom_err_message = visitor_uid.error_msg;
                custom_err_title = 'SERVER ERROR';
                break;
            case !user:
                custom_statusCode = 404;
                custom_err_message = 'User data not found';
                custom_err_title = 'NOT FOUND';
            case !widget:
                custom_statusCode = 404;
                custom_err_message = 'Widget data not found';
                custom_err_title = 'NOT FOUND';
            default:
                break;
        }
        // increment visitorData count
        setVisitorData(visitor);
        // increment browserData count
        setBrowserData(visitor_browser.name, visitor);
        const analytics_data = await visitor.save();
        if(!analytics_data){
            custom_statusCode = 500;
            custom_err_message = 'Unable to save updated analytics data';
            custom_err_title = 'SERVER ERROR';
            
        }
        // create a new visitor 
        const add_visitor = await visitor.updateOne({
            $push: {
              visitor: {
                $each: [
                  {
                    _id: visitor_uid,
                    country: isoCode,
                    browser: visitor_browser.name,
                    mode: widget.customization.chat_mode
                  }
                ],
                $position: 0
              }
            }
        });
        if(!add_visitor){
            custom_statusCode = 500;
            custom_err_message = 'Unable to save the new visitor';
            custom_err_title = 'SERVER ERROR';
        }
        // push the new object to the array
        visitor.visitor.unshift({
            _id: visitor_uid,
            country: isoCode,
            browser: visitor_browser.name,
            mode: widget.customization.chat_mode
        });
        // update SSE data
        sendAdminSSEInfo('visitor', user._id, visitor.visitor)
        // notify the user
        const notify_ws_user = sendWsUserNotification("admin", user_hash, visitor_uid, { sent_from: "Admin", title: "New visitor", content: `${visitor_uid} is visiting` });
        if(notify_ws_user.error){
            custom_statusCode = 500;
            custom_err_message = 'Unable to notify the offline user';
            custom_err_title = 'SERVER ERROR';
        }
        // generate a new JWT token for the visitor
        const generate_token = generateJWT(visitor_uid);
        if(generate_token.error) {
            custom_statusCode = 500;
            custom_err_message = 'Unable to generate a new visitor auth token';
            custom_err_title = 'SERVER ERROR';
        }

        // TODO: Uncomment this for production
        await redis_widget_tokens.set(visitor_hash, JSON.stringify(generate_token.jwtToken), 'EX', 3600);
        res.send({ visitor_hash: visitor_hash });
    } catch(err) {
        next({ 
            statusCode: custom_statusCode || 500, 
            title: custom_err_title, 
            message: custom_err_message, 
            stack: err.stack 
        });
    }
});
//@desc Route to delete a specific visitor along with the chatroom
//@route DELETE /visitor/delete-visitor
//@access PRIVATE
const deleteVisitor = asyncHandler( async(req,res,next) => {
    try{
        // verify the acces token
        await VerifyFirebaseToken(req,res);
        // will need the user hash + the visitor _id
        const { user_hash, visitor_id } = req.body;
        // find the user
        const user = await User.findOne({ user_access: user_hash });
        const [visitor_collection, chatroom_collection] = await Promise.all([
            //find the visitor collection
            Visitor.findById(user_hash),
            // find the chatroom collection
            Chatroom.findById(user_hash)
        ]);
        switch (!visitor_collection || !user || !chatroom_collection){
            case !visitor_collection:
                custom_statusCode = 400;
                custom_err_message = 'Visitor data not found';
                custom_err_title = 'NOT FOUND';
                break;
            case !user:
                custom_statusCode = 404;
                custom_err_message = 'User data not found';
                custom_err_title = 'NOT FOUND';
                break;
            case !chatroom_collection:
                custom_statusCode = 404;
                custom_err_message = 'Chatroom data not found';
                custom_err_title = 'NOT FOUND';
                break;
            default:
                break;
        }
        // loop through the visitor array and check for the matching _id
        const visitor_index = visitor_collection.visitor.findIndex(visitr => visitr._id.toString() === visitor_id.toString());
        //loop through his chatrooms to find the room
        const chatroom_index = chatroom_collection.chat_rooms.findIndex(rooms => rooms.visitor.toString() === visitor_id.toString());
        if(visitor_index === -1 || chatroom_index === -1){
            custom_statusCode = 404;
            custom_err_message = `${visitor_index === -1? 'Visitor not found' : 'Chatroom not found'}`;
            custom_err_title = 'NOT FOUND';
        }
        visitor_collection.visitor.splice(visitor_index, 1);
        chatroom_collection.chat_rooms.splice(chatroom_index,1);
        // save everything
        await Promise.all([
            redis_chatroom.del(visitor_id),
            visitor_collection.save(),
            chatroom_collection.save()
        ]);
        sendAdminSSEInfo('visitor', user._id, visitor_collection.visitor);
        res.status(200).json({ message: "Visitor removed" });
    } catch(err){   
        next({ 
            statusCode: custom_statusCode || 500, 
            title: custom_err_title, 
            message: custom_err_message, 
            stack: err.stack 
        });
    }
});
//@desc send an email to the admin
//@route POST /visitor/send-email
//@access PRIVATE
const sendEmail = asyncHandler( async(req,res,next) => {
    try{
        // verify the hash
        const verify = await VerifyWidgetToken(req,res);
        if(!verify){
            return
        }
        // get the admin email
        const user = await User.findOne({ user_access: req.params.user_hash });
        // get the data from the body
        const { from, content } = req.body 
        // verify if it is a valid email
        const verify_email = email_regex.test(from);
        if(!verify_email){
            custom_statusCode = 400
            custom_err_title = 'VALIDATION ERROR'
            custom_err_message = 'Invalid email address.'
        }
        // sanitize the data
        const sanitize_from = from.replace(/<\/?[^>]+(>|$)/g, "");
        const sanitize_content = content.replace(/<\/?[^>]+(>|$)/g, "");

        const data = {
            "from": `${sanitize_from}`,
            "to": `${user.email}`,
            "subject": `Visitor ${sanitize_from}, has sent you an email`,
            "text": `Hi, you received the following from your visitor ${sanitize_from}: ${sanitize_content}`
        }
        const response = await send(data);
        if(!response){
            custom_statusCode = 500
            custom_err_title = 'SERVER ERROR'
            custom_err_message = 'Failed to send email to the admin.'
        }
        res.status(200).send({ success: true, msg: 'email sent' });
    } catch(err){
        next({ 
            statusCode: custom_statusCode || 500, 
            title: custom_err_title, 
            message: custom_err_message, 
            stack: err.stack 
        });
    }
})

export { visitorInfoFetch, createVisitor, deleteVisitor, sendEmail }