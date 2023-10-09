import asyncHandler from 'express-async-handler';
import Widget from '../models/widgetModels.js';
import User from '../models/userModels.js';
import { visitorSSEAuth, sendVisitorNotification, clearVisitorNotifications } from '../utils/manageVisitors.js';
import { widgetInstallStatus } from '../utils/manageSSE.js';
import { VerifyFirebaseToken, VerifyUserHash } from '../middleware/authHandle.js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const sse_connections = new Map()
let connect_sse = null;

//@desc To get the widget
//@route GET /code/:userhash.js
//@access PRIVATE
const initializeWidgetTemplate = asyncHandler( async(req,res,next) => {
    try{
        // take the user hash and fetch the widget collection
        const { userhash } = req.params
        // verify if the user hash is still ok
        const verify_user_access = await VerifyUserHash(userhash);
        if(!verify_user_access){
            res.status(404);
            next();
        }
        // get the loader script
        const response = await axios.get(process.env.WIDGET_TEMPLATE_URL)
        if(!response){
            res.status(500);
            next();
        }
        // set installed to true
        widgetInstallStatus(userhash, true);
        // Replace '{{USER_HASH}}' with the actual user hash
        const scriptContent = response.data.replace('{{USER_HASH}}', userhash);
        // Send the modified script content as the response
        res.setHeader('Content-Type', 'application/javascript')
        res.send(scriptContent);
    } catch(err) {
        console.log('ERROR initializing the widget');
        next(err);
    }
});
//@desc To give the script tag link to correct user
//@route GET /code/link
//@access PRIVATE
const widgetCustomLink = asyncHandler(async(req,res,next) => {
    try{
        // verify + decode Firebase token 
        const decode_token = await VerifyFirebaseToken(req, res);
        if(!decode_token){
            res.status(500);
            next();
        }
        const user = await User.findById(decode_token.user_id);
        if(!user){
            res.status(500);
            next();
        }
        res.status(200).json({ link: `<script type="module" src="http://localhost:8080/code/${user.user_access}" async></script>`})

    } catch(err){
        console.log('ERROR WidgecustomLink()');
        next(err)
    }
});
//@desc auth for the widget SSE connection
//@route POST /code/sse-auth
//@access PRIVATE
const widgetSSEAuth = asyncHandler( async(req,res,next) => {
    try{
        // get the user access
        const { user_access } = req.body
        // verify the hash
        const verify_user_hash = VerifyUserHash(user_access);
        if(!verify_user_hash){
            res.status(401);
            next();
        }
        // authenticate the visitor before setting up the SSE connection
        const auth_visitor = await visitorSSEAuth(req);
        if(!Object.keys(auth_visitor).length === 0){
            res.status(401);
            next();
        }
        connect_sse = {
            id: auth_visitor.id,
            user_access: user_access
        }
        res.status(201).json({ sse_link: process.env.WIDGET_SSE_CONNECTION_LINK });
    } catch(err){
        console.log('ERROR widgetSSEAuth()');
        next(err);
    }
});
//@desc auth and set up an SSE connection for the widget notification
//@route GET /code/sse-connection
//@access PRIVATE
const widgetSSEConnection = asyncHandler(async(req,res,next) => {
    try{
        if(connect_sse){
            // Set up the SSE headers
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:3000');  
            res.write('SSE connection started\n\n');
            // send the updates
            sse_connections.set(connect_sse.id, res);
            sendVisitorNotification(connect_sse.user_access, connect_sse.id);
            // clean up if the connection is closed or if an error occurs
            res.on("error", (error) => {
                next(error);
                sse_connections.delete(connect_sse.id);// delete the connected user
            });
                
            res.on('close', () => {
                if(sse_connections.get(connect_sse.id)){
                    clearVisitorNotifications(connect_sse.user_access, connect_sse.id);
                    sse_connections.delete(connect_sse.id);// delete the connected user
                }
            });
        }
    } catch(err){
        console.log('ERROR widgetSSEConnection()');
        next(err);
    }
});
//@desc to get the customization object for the widget
//@route GET /code/styling-:userhash
//@access PUBLIC
const widgetStyling = asyncHandler(async(req,res,next) => {
    try{
        // get the user_hash from the
        const { userhash } = req.params
        // verify user hash
        const verify_user_hash = VerifyUserHash(userhash);
        if(!verify_user_hash){
            res.status(401);
            next();
        }
        // fetch the correct widget
        const widget_collection = await Widget.findById(userhash);
        if(!widget_collection){
            res.status(404);
            next();
        }
        // send the object back to the  front-end
        res.status(200).send({ widget_style: widget_collection.customization });
    } catch(err){
        console.log('ERROR widgetStyling()');
        next(err);
    }
});
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
            res.status(500);
            next();
        }
        res.status(200).json({ message: "Widget updated" });
    } catch(err){
        console.log('ERROR saveWidgetStyling()');
        next(err);
    }
});



export { initializeWidgetTemplate, widgetCustomLink, widgetSSEAuth, widgetSSEConnection, widgetStyling, saveWidgetStyling, sse_connections }