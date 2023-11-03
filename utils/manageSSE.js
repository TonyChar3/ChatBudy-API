import { connections } from "../controllers/sseControllers.js";
import { sse_connections } from "../controllers/widgetControllers.js";
import User from '../models/userModels.js';
import admin from 'firebase-admin';
import Visitors from '../models/visitorsModels.js';
import ChatRoom from '../models/chatRoomModels.js';

/**
 * Function to update the visitors info safely
 *  when the visitor submits a new email or not
 */
const sendAdminFreshUpdatedInfo = async(user_hash, data) => {
    try{
        const user = await User.findOne({ user_access: user_hash });
        // send info to the front-end
        sendAdminSSEInfo('visitor', user._id, data);
    } catch(err){
        console.log('sendAdminFreshUpdatedInfo() at manageSSE.js in utils: Unable to send Admin new info. ', err.stack);
        return {
            error: true,
            error_msg: 'sendAdminFreshUpdatedInfo() at manageSSE.js in utils: Unable to send Admin new info',
            error_stack: err.stack || 'NO STACK TRACE.'
        }
    }
}
/**
 * Function to send new data through the SSE connection
 */
const sendAdminSSEInfo = (type_name, user_id, data) => {
    const connection = connections.get(user_id);
    if(connection){
        connection.write(`data:${JSON.stringify({ type: type_name, data: data })}\n\n`);
    }  
}
/**
 * Function to send notifications updates to the visitor
 *  through the widget SSE connection
 */
const sendWidgetVisitorNotifications = (user_id, data) => {
    const connection = sse_connections.get(user_id);
    if(connection){
        connection.write(`data:${JSON.stringify(data.length)}\n\n`);
    }
}
/**
 * Send the admin offline - online status
 */
const sendWidgetAdminStatus = async(user_hash, user_id) => {
    // get the admin status
    const admin_status = await adminLogInStatus(user_hash);
    const connection = sse_connections.get(user_id);
    if(connection){
        connection.write(`data:${JSON.stringify({ type: 'admin-status', data: admin_status })}\n\n`);
    }
}
/**
 * Function to send the admin panel user data for the SSE
 */
const fetchAdminData = async(connected_user) => {
    try{
        if(connected_user){
            //decode the firebase auth token
            const decode_token = await admin.auth().verifyIdToken(connected_user.accessToken);
            // get the user data
            const user = await User.findById(decode_token.uid);
            const [visitor_collection, chatroom_collection] = await Promise.all([
                ChatRoom.findById(user.user_access),
                Visitors.findById(user.user_access)
            ]);
            if(!visitor_collection){
                return {
                    error: true,
                    error_msg: 'fetchAdminData() at manageSSE.js in utils: fetching visitor collection failed.',
                    error_stack: err.stack || 'NO STACK TRACE.'
                }
            }
            if(!chatroom_collection){
                return {
                    error: true,
                    error_msg: 'fetchAdminData() at manageSSE.js in utils: fetching chatroom collection failed.',
                    error_stack: err.stack || 'NO STACK TRACE.'
                }
            }
            // send visitors
            if(!visitor_collection.visitor.length > 0){
                sendAdminSSEInfo('visitor', user._id, []);
            } else {
                sendAdminSSEInfo('visitor', user._id, visitor_collection.visitor);
            }
            // send notification
            if(!user.notification.length > 0) {
                sendAdminSSEInfo('notification', user._id, []);
                return
            } else {
                sendAdminSSEInfo('notification', user._id, user.notification);
            }
            // send analytics
            sendAdminSSEInfo('analytics',user._id, { 
                conversion_data: chatroom_collection.conversionData,
                visitor_data: visitor_collection.visitorData,
                browser_data: visitor_collection.browserData
            });
        }
    } catch(err){
        console.log('fetchAdminData() at manageSSE.js in utils: Unable to fetch admin data. ', err.stack);
        return {
            error: true,
            error_msg: 'fetchAdminData() at manageSSE.js in utils: Unable to fetch admin data',
            error_stack: err.stack || 'NO STACK TRACE.'
        }
    }
}
/**
 * Function to send the Admin log in status to the widget
 */
const adminLogInStatus = async(admin_hash) => {
    try{
        const user_object = await User.findOne({ user_access: admin_hash });
        const valid_auth_user = await admin.auth().getUser(user_object._id);
        if(valid_auth_user) {
            const user_online = connections.get(user_object._id)
            if(!user_online){
                return false
            } else {
                return true
            }
        }
    } catch(err){
        console.log('adminLogInStatus() at manageSSE.js in utils: Unable to set admin status. ', err.stack);
        return {
            error: true,
            error_msg: 'adminLogInStatus() at manageSSE.js in utils: Unable to set admin status.',
            error_stack: err.stack || 'NO STACK TRACE.'
        }
    }
}
/**
 * Function to send the Widget Installed status
 */
const widgetInstallStatus = async(user_hash, data) => {
    try{
        // fetch the user with his hash
        const current_user = await User.findOne({ user_access: user_hash });
        // send the widget status
        sendAdminSSEInfo('widget_status', current_user._id, data);
    } catch(err){
        console.log('widgetInstallStatus() at manageSSE.js in utils: Unable to set widget install status. ', err.stack);
        return {
            error: true,
            error_msg: 'widgetInstallStatus() at manageSSE.js in utils: Unable to set widget install status.',
            error_stack: err.stack || 'NO STACK TRACE.'
        }
    }
}

export { 
    sendAdminFreshUpdatedInfo, 
    sendAdminSSEInfo,
    sendWidgetVisitorNotifications,  
    adminLogInStatus,
    widgetInstallStatus,
    sendWidgetAdminStatus,
    fetchAdminData
}