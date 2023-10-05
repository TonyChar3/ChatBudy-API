import asyncHandler from 'express-async-handler';
import admin from 'firebase-admin';
import User from '../models/userModels.js';
import Visitors from '../models/visitorsModels.js';
import ChatRoom from '../models/chatRoomModels.js';

const connections = new Map()
let connectedUser;

//@desc Route grant access to the SSE connection
const AuthSSEconnection = asyncHandler(async(req,res,next) => {
    try{
        const token = req.headers.authorization.split(' ')[1];
        const decodeToken = await admin.auth().verifyIdToken(token);
        if(decodeToken) {
            const userID = decodeToken.uid
            connectedUser = {
                id: userID,
                accessToken: token
            }
            res.status(201).json({ message: "SSE connection granted"})
        } else if (!decodeToken) {
            next(err)
        }
    } catch(err){
        next(err)
    }
});

//@desc Route to initiate the SSE connection
//@route GET /sse
//@access PRIVATE
const SSEconnection = asyncHandler(async(req,res,next) => {
    try{
        if(connectedUser){
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
                    
            res.write('SSE connection started\n\n');

            connections.set(connectedUser.id, res);
            fetchAllVisitor();
            fetchAllNotification();
            fetchAnalyticsData();
            
            res.on("error", (error) => {
                console.log(error)
                connections.delete(connectedUser.id);
            });
                
            res.on('close', () => {
                connections.delete(connectedUser.id);
            });
        }
    } catch(err){
        console.log(err)
        next(err)
    }
});

/**
 * Function to send updates to the font-end client
 */
const sendUpdateToUser = (user_id, data) => {
    const connection = connections.get(user_id);
    const visitor_object = {
        type: 'visitor',
        data: data
    }
    if(connection) {
        connection.write(`data:${JSON.stringify(visitor_object)}\n\n`)
    }
}

/**
 * Function to send notifications updates to the front-end
 */
const sendNotificationUpdate = (user_id, data) => {
    const connection = connections.get(user_id);
    const notification_object = {
        type: 'notification',
        data: data
    }
    if(connection) {
        connection.write(`data:${JSON.stringify(notification_object)}\n\n`)
    }
}

/**
 * Function to update the visitors info on the frontend
 */
const sendUpdatedInfo = async(user_hash, data) => {
    const user = await User.findOne({ user_access: user_hash })
    if(!user){
        throw new Error("Send update info function ERROR: unable to find the user with the provided user hash")
    }
    const connection = connections.get(user._id);
    const updatedInfo_object = {
        type: 'visitor',
        data: data
    }
    if(connection) {
        connection.write(`data:${JSON.stringify(updatedInfo_object)}\n\n`)
    }
}

/**
 * Function to send the analytics data update to the frontend
 */
const sendAnalyticsUpdate = async(user_id, data) => {
    const connection = connections.get(user_id);
    const analytics_object = {
        type: 'analytics',
        data: data
    }
    if(connection) {
        connection.write(`data:${JSON.stringify(analytics_object)}\n\n`)
    }
}

/**
 * Function to send the visitors array to the front-end
 */
const fetchAllVisitor = async() => {
    try{
        if(connectedUser){
            const decodedToken = await admin.auth().verifyIdToken(connectedUser.accessToken)
            if(decodedToken){
                const user = await User.findById(decodedToken.uid)
                if(!user){
                    throw new Error("Unable to find your visitor array...please reload and try again")
                }

                const visitor_array = await Visitors.findById(user.user_access);
                if(!visitor_array) {
                    throw new Error("Unable to find your visitor array...please reload and try again")
                }
                if(visitor_array.visitor.length > 0) {
                    sendUpdateToUser(user._id, visitor_array.visitor);
                } else {
                    sendUpdateToUser(user._id, []);
                }
            }
        }
    } catch(err){
        console.log(err);
    }
}

/**
 * Function to send the notifications array to the front-end
 */
const fetchAllNotification = async() => {
    try{
        if(connectedUser){
            const decodedToken = await admin.auth().verifyIdToken(connectedUser.accessToken)
            if(decodedToken){
                const user = await User.findById(decodedToken.uid)
                if(!user){
                    throw new Error("Unable to find your visitor array...please reload and try again")
                }
                if(user.notification.length > 0) {
                    sendNotificationUpdate(user._id, user.notification);
                } else {
                    sendNotificationUpdate(user._id, []);
                }
            }
        }
    } catch(err){
        console.log(err);
    }
}

/**
 * Function to send the chatroom analytics data to the front-end
 */
const fetchAnalyticsData = async() => {
    try{
        if(connectedUser){
            const decodedToken = await admin.auth().verifyIdToken(connectedUser.accessToken)
            if(decodedToken){
                const user = await User.findById(decodedToken.uid);
                if(!user){
                    throw new Error("Unable to find your visitor array...please reload and try again")
                }
                const [ chatroom_collection, visitor_collection ] = await Promise.all([
                    ChatRoom.findById(user.user_access),
                    Visitors.findById(user.user_access)
                ]);
                if(!chatroom_collection){
                    throw new Error('Unable to find the chatroom collection')
                } else if (!visitor_collection){
                    throw new Error('Unable to find the visitor collection')
                }
                const analytics_data = {
                    conversion_data: chatroom_collection.conversionData,
                    visitor_data: visitor_collection.visitorData,
                    browser_data: visitor_collection.browserData
                }
                sendAnalyticsUpdate(user._id, analytics_data);
            }
        }
    } catch(err){
        console.log('Fetch chatroom analytics data: ',err)
    }
}

/**
 * Function to send the Admin log in status to the widget
 */
const adminLogInStatus = async(admin_hash) => {
    try{
        const user_object = await User.findOne({ user_access: admin_hash })
        if(!user_object){
            throw new Error('Cannot find user...please try again')
        }
        const valid_auth_user = await admin.auth().getUser(user_object._id)
        if(!valid_auth_user){
            throw new Error('User not authenticated...FORBIDDEN')
        } else if(valid_auth_user) {
            const user_online = connections.get(user_object._id)
            if(!user_online){
                return false
            } else {
                return true
            }
        }

    } catch(err){
        console.log(err)
    }
}

/**
 * Function to send the Widget Installed status
 */
const WidgetInstallStatus = async(user_hash, data) => {
    try{
        // fetch the user with his hash
        const current_user = await User.findOne({ user_access: user_hash })
        if(!current_user){
            throw new Error('ERROR WidgetInstallStatus: Unable to find the user')
        }
        // send the widget status
        const connection = connections.get(current_user._id);
        const widget_status_object = {
            type: 'widget_status',
            data: data
        }
        // if the connection is not found
        if(!connection) {
            return
        }
        connection.write(`data:${JSON.stringify(widget_status_object)}\n\n`)
    } catch(err){
        console.log('ERROR setting the widget install status: ', err)
        next(err)
    }
}


export { SSEconnection, sendUpdateToUser, AuthSSEconnection, adminLogInStatus, sendNotificationUpdate, sendUpdatedInfo, sendAnalyticsUpdate, WidgetInstallStatus }