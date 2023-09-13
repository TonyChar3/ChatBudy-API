import asyncHandler from 'express-async-handler';
import fs from 'fs';
import path from 'path';
import Widget from '../models/widgetModels.js';
import User from '../models/userModels.js';
import admin from 'firebase-admin';
import { visitorSSEAuth, sendVisitorNotification, clearVisitorNotifications } from '../utils/manageVisitors.js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const sse_connections = new Map()
let connect_sse = null;

//@desc To get the widget
//@route GET /code/:userhash.js
//@access PRIVATE
const initializeWidget = asyncHandler( async(req,res,next) => {
    try{
        // take the user hash and fetch the widget collection
        const { userhash } = req.params
        // get the loader script
        const response = await axios.get(process.env.WIDGET_TEMPLATE_URL)
        // run it
        if (response.status === 200) {
            // Replace '{{USER_HASH}}' with the actual user hash
            const scriptContent = response.data.replace('{{USER_HASH}}', userhash);
            // Send the modified script content as the response
            res.setHeader('Content-Type', 'application/javascript')
            res.send(scriptContent);
        } else {
            res.status(500).send('Error fetching template');
        }
    } catch(err) {
        console.log(err)
        next(err)
    }
});

//@desc To give the script tag link to correct user
const widgetCustomLink = asyncHandler(async(req,res,next) => {
    try{
        const token = req.headers.authorization.split(" ")[1]
        const decodedToken = await admin.auth().verifyIdToken(token)
        if(decodedToken){
            const user = await User.findById(decodedToken.user_id);
            if(!user){
                res.status(500);
            }
            res.status(200).json({ link: `<script type="module" src="http://localhost:8080/code/${user.user_access}" async></script>`})
        }
    } catch(err){
        console.log(err)
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
        // authenticate the visitor before setting up the SSE connection
        const auth_visitor = await visitorSSEAuth(req);
        connect_sse = {
            id: auth_visitor.id,
            user_access: user_access
        }
        res.status(201).json({ sse_link: process.env.WIDGET_SSE_CONNECTION_LINK })
    } catch(err){
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
                next(error)
                sse_connections.delete(connect_sse.id)// delete the connected user
            });
                
            res.on('close', () => {
                if(sse_connections.get(connect_sse.id)){
                    clearVisitorNotifications(connect_sse.user_access, connect_sse.id)
                    sse_connections.delete(connect_sse.id)// delete the connected user
                }
            });
        }
    } catch(err){
        next(err)
    }
});

/**
 * Function to send notifications updates to the front-end
 */
const sendVisitorNotifications = (user_id, data) => {
    const connection = sse_connections.get(user_id);
    if(connection) {
        connection.write(`data:${JSON.stringify(data.length)}\n\n`)
    }
}



export { initializeWidget, widgetCustomLink, widgetSSEAuth, widgetSSEConnection, sendVisitorNotifications }