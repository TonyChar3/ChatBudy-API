import asyncHandler from 'express-async-handler';
import Widget from '../models/widgetModels.js';
import User from '../models/userModels.js';
import { visitorSSEAuth, sendVisitorNotification, clearVisitorNotifications } from '../utils/manageVisitors.js';
import { widgetInstallStatus, sendWidgetAdminStatus } from '../utils/manageSSE.js';
import { VerifyFirebaseToken, VerifyUserHash, VerifyWidgetToken } from '../middleware/authHandle.js';
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();
const sse_connections = new Map()
let connect_sse = null;
let custom_statusCode;
let custom_err_message;
let custom_err_title;

//@desc To get the widget
//@route GET /code/:userhash.js
//@access PRIVATE
const initializeWidgetTemplate = asyncHandler( async(req,res,next) => {
    let userhash;
    // verify if the user hash is still ok
    const verify_hash = await VerifyUserHash(req,res);
    try{
        if(verify_hash){
            const { user_hash } = req.params;
            userhash = user_hash;
        }
        // get the loader script
        const response = await axios.get(process.env.WIDGET_TEMPLATE_URL)
        if(!response){
            custom_statusCode = 404;
            custom_err_message = 'Widget template not found';
            custom_err_title = 'NOT FOUND';
        }
        // set installed to true
        const widget_status = widgetInstallStatus(userhash, true);
        if(widget_status.error){
            throw new Error(`${widget_status.error_msg}`);
        }
        // Replace '{{USER_HASH}}' with the actual user hash
        const scriptContent = response.data.replace('{{USER_HASH}}', userhash);
        // Send the modified script content as the response
        res.setHeader('Content-Type', 'application/javascript')
        res.send(scriptContent);
    } catch(err) {
        next({ 
            statusCode: custom_statusCode || 500, 
            title: custom_err_title, 
            message: custom_err_message, 
            stack: err.stack 
        });
    }
});
//@desc To give the script tag link to correct user
//@route GET /code/link
//@access PRIVATE
const widgetCustomLink = asyncHandler(async(req,res,next) => {
    try{
        // verify + decode Firebase token 
        const decode_token = await VerifyFirebaseToken(req, res);
        const user = await User.findById(decode_token.user_id);
        if(!user){
            custom_statusCode = 404;
            custom_err_message = 'User data not found';
            custom_err_title = 'NOT FOUND';
        }
        res.status(200).json({ link: `<script type="module" src="${process.env.HOST_NAME}/code/${user.user_access}" async></script>`})

    } catch(err){
        next({ 
            statusCode: custom_statusCode || 500, 
            title: custom_err_title, 
            message: custom_err_message, 
            stack: err.stack 
        });
    }
});
//@desc auth for the widget SSE connection
//@route POST /code/sse-auth
//@access PRIVATE
const widgetSSEAuth = asyncHandler( async(req,res,next) => {
    try{
        // verify the hash
        const verify = await VerifyWidgetToken(req,res);
        if(!verify){
            return;
        }
        // authenticate the visitor before setting up the SSE connection
        const auth_visitor = await visitorSSEAuth(req);
        if(!Object.keys(auth_visitor).length === 0){
            custom_statusCode = 401;
            custom_err_message = 'Invalid token';
            custom_err_title = 'UNAUTHORIZED';
        }
        connect_sse = {
            id: auth_visitor.id,
            user_access: req.body.user_hash
        }
        res.status(201).json({ sse_link: process.env.WIDGET_SSE_CONNECTION_LINK });
    } catch(err){
        next({ 
            statusCode: custom_statusCode || 500, 
            title: custom_err_title, 
            message: custom_err_message, 
            stack: err.stack 
        });
    }
});
//@desc auth and set up an SSE connection for the widget notification
//@route GET /code/sse-connection
//@access PRIVATE
// TODO: Add a dynamic Access-Control-Allow-Origin domain for production
const widgetSSEConnection = asyncHandler(async(req,res,next) => {
    try{
        const origin = req.header('Origin');
        // Set up the SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', origin);  
        res.write('SSE connection started\n\n');
        // send the updates
        sse_connections.set(connect_sse.id, res);
        sendVisitorNotification(connect_sse.user_access, connect_sse.id);
        sendWidgetAdminStatus(connect_sse.user_access, connect_sse.id);
        // clean up if the connection is closed or if an error occurs
        res.on("error", (error) => {
            custom_err_message = `${error.message}`
            console.log(error)
            sse_connections.delete(connect_sse.id);// delete the connected user
        });
            
        res.on('close', () => {
            console.log('widget sse', sse_connections.get(connect_sse.id))
            if(sse_connections.get(connect_sse.id)){
                clearVisitorNotifications(connect_sse.user_access, connect_sse.id);
                sse_connections.delete(connect_sse.id);// delete the connected user
            }
        });
    } catch(err){
        next({ 
            statusCode: custom_statusCode || 500, 
            title: custom_err_title || 'Server Error', 
            message: custom_err_message || '', 
            stack: err.stack 
        });
    }
});
//@desc to get the customization object for the widget
//@route GET /code/styling-:userhash
//@access PUBLIC
const widgetStyling = asyncHandler(async(req,res,next) => {
    try{
        // verify for visitor token
        const verify = await VerifyWidgetToken(req,res);
        if(!verify){
            return
        }
        // get the user_hash
        const { user_hash } = req.params;
        // fetch the correct widget
        const widget_collection = await Widget.findById(user_hash);
        if(!widget_collection){
            custom_err_message = 'User widget data not found';
            custom_err_title = 'NOT FOUND';
        }
        // send the object back to the  front-end
        res.status(200).send({ 
            widget_chat_mode: widget_collection.chat_mode, 
            widget_style: widget_collection.customization 
        });
    } catch(err){
        next({ statusCode: 500, title: custom_err_title, message: custom_err_message, stack: err.stack });
    }
});
//@desc to get the customization object for the admin widget mock
//@route GET /code/admin-style-:user_hash
//@acces PUBLIC
const widgetAdminStyling = asyncHandler(async(req,res,next) => {
    try{
        //verify firebase token
        await VerifyFirebaseToken(req,res);
        // get the user hash
        const { user_hash } = req.params;
        // fetch info from the db collection
        const widget_collection = await Widget.findById(user_hash);
        if(!widget_collection){
            custom_err_message = 'User widget data not found';
            custom_err_title = 'NOT FOUND';
        }
        // send the object back to the  front-end
        res.status(200).send({ 
            widget_chat_mode: widget_collection.chat_mode, 
            widget_style: widget_collection.customization 
        });
    } catch(err){
        next({ statusCode: 500, title: custom_err_title, message: custom_err_message, stack: err.stack });
    }
})
//@desc to save the updated customization for the widget
//@route POST /code/save
//@access PRIVATE
const saveWidgetStyling = asyncHandler(async(req,res,next) => {
    try{
        let update = {$set: {}}
        // get the object from the body
        const { customization_obj } = req.body
        // verify the firebase token
        const decode_token = await VerifyFirebaseToken(req, res);
        // find the user collection for the user_access
        const user = await User.findById( decode_token.user_id);
        // replace with the new style
        for (let key in customization_obj){
            update.$set[`customization.${key}`] = customization_obj[key]
        }
        const update_widget = await Widget.findByIdAndUpdate(
            {_id: user.user_access},
            update,
            {new:true}
        );
        if(!update_widget){
            custom_statusCode = 500;
            custom_err_message = 'Unable to update the widget style';
            custom_err_title = 'SERVER ERROR';
        }
        res.status(200).json({ message: "Widget updated" });
    } catch(err){
        next({ 
            statusCode: custom_statusCode || 500, 
            title: custom_err_title || 'SERVER ERROR', 
            message: custom_err_message, 
            stack: err.stack 
        });
    }
});

export { initializeWidgetTemplate, widgetCustomLink, widgetSSEAuth, widgetSSEConnection, widgetStyling, saveWidgetStyling, widgetAdminStyling, sse_connections }