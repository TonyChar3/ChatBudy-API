import { connections } from "../controllers/sseControllers.js";
import { sse_connections } from "../controllers/widgetControllers.js";
import User from '../models/userModels.js';
import admin from 'firebase-admin';
import Visitors from '../models/visitorsModels.js';
import ChatRoom from '../models/chatRoomModels.js';

let custom_statusCode = '';
let custom_err_message = '';
let custom_err_title = '';

/**
 * Function to update the visitors info safely
 *  when the visitor submits a new email or not
 */
const sendAdminFreshUpdatedInfo = async(user_hash, data) => {
    try{
        const user = await User.findOne({ user_access: user_hash });
        if(!user){
            custom_statusCode = 404;
            custom_err_message = 'User data not found';
            custom_err_title = 'NOT FOUND';
        }
        // send info to the front-end
        sendAdminSSEInfo('visitor', user._id, data);
    } catch(err){
        throw Error(JSON.stringify({
            status: custom_statusCode || 500,
            title: custom_err_title || 'SERVER ERROR',
            message: custom_err_message || 'Unable to save chat to the DB',
            stack: err.stack
        }));
    }
}
/**
 * Function to send new data through the SSE connection
 */
const sendAdminSSEInfo = (type_name, user_id, data) => {
    const connection = connections.get(user_id);
    const data_object = {
        type: type_name,
        data: data
    }
    if(connection){
        connection.write(`data:${JSON.stringify(data_object)}\n\n`);
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
 * Function to send the visitors array to the front-end
 */
const fetchAllAdminVisitor = async(connected_user) => {
    try{
        if(connected_user){
            const decode_token = await admin.auth().verifyIdToken(connected_user.accessToken);
            if(!decode_token){
                custom_statusCode = 401;
                custom_err_message = 'Invalid auth token';
                custom_err_title = 'UNAUTHORIZED';
            }
            const user = await User.findById(decode_token.uid);
            if(!user){
                custom_statusCode = 404;
                custom_err_message = 'User data not found';
                custom_err_title = 'NOT FOUND';
            }
            const visitor_collection = await Visitors.findById(user.user_access);
            if(!visitor_collection) {
                custom_statusCode = 404;
                custom_err_message = 'Visitor data not found';
                custom_err_title = 'NOT FOUND';
            }
            if(!visitor_collection.visitor.length > 0){
                sendAdminSSEInfo('visitor', user._id, []);
                return;
            }
            sendAdminSSEInfo('visitor', user._id, visitor_collection.visitor);
            return;
        }
    } catch(err){
        throw Error(JSON.stringify({
            status: custom_statusCode || 500,
            title: custom_err_title || 'SERVER ERROR',
            message: custom_err_message || 'Unable to save chat to the DB',
            stack: err.stack
        }));
    }
}
/**
 * Function to send the notifications array to the front-end
 */
const fetchAllAdminNotification = async(connected_user) => {
    try{
        if(connected_user){
            const decode_token = await admin.auth().verifyIdToken(connected_user.accessToken);
            if(!decode_token){
                custom_statusCode = 401;
                custom_err_message = 'Invalid auth token';
                custom_err_title = 'UNAUTHORIZED';
            }
            const user = await User.findById(decode_token.uid);
            if(!user){
                custom_statusCode = 404;
                custom_err_message = 'User data not found';
                custom_err_title = 'NOT FOUND';
            }
            if(!user.notification.length > 0) {
                sendAdminSSEInfo('notification', user._id, []);
                return
            }
            sendAdminSSEInfo('notification', user._id, user.notification);
            return
        }
    } catch(err){
        throw Error(JSON.stringify({
            status: custom_statusCode || 500,
            title: custom_err_title || 'SERVER ERROR',
            message: custom_err_message || 'Unable to save chat to the DB',
            stack: err.stack
        }));
    }
}
/**
 * Function to send the chatroom analytics data to the front-end
 */
const fetchAdminAnalyticsData = async(connected_user) => {
    try{
        if(connected_user){
            const decode_token = await admin.auth().verifyIdToken(connected_user.accessToken)
            if(!decode_token){
                custom_statusCode = 401;
                custom_err_message = 'Invalid auth token';
                custom_err_title = 'UNAUTHORIZED';
            }
            const user = await User.findById(decode_token.uid);
            if(!user){
                custom_statusCode = 404;
                custom_err_message = 'User data not found';
                custom_err_title = 'NOT FOUND';
            }
            const [ chatroom_collection, visitor_collection ] = await Promise.all([
                ChatRoom.findById(user.user_access),
                Visitors.findById(user.user_access)
            ]);
            switch (!chatroom_collection || !visitor_collection){
                case !chatroom_collection:
                    custom_statusCode = 404;
                    custom_err_message = 'Chatroom data not found';
                    custom_err_title = 'NOT FOUND'
                    break;
                case !visitor_collection:
                    custom_statusCode = 404;
                    custom_err_message = 'Visitor data not found';
                    custom_err_title = 'NOT FOUND'
                    break;
                default:
                    break;
            }
            // send the analytics data
            sendAdminSSEInfo('analytics',user._id, { 
                conversion_data: chatroom_collection.conversionData,
                visitor_data: visitor_collection.visitorData,
                browser_data: visitor_collection.browserData
            });
        }
    } catch(err){
        throw Error(JSON.stringify({
            status: custom_statusCode || 500,
            title: custom_err_title || 'SERVER ERROR',
            message: custom_err_message || 'Unable to save chat to the DB',
            stack: err.stack
        }));
    }
}


/**
 * Function to send the Admin log in status to the widget
 */
const adminLogInStatus = async(admin_hash) => {
    try{
        const user_object = await User.findOne({ user_access: admin_hash });
        if(!user_object){
            custom_statusCode = 404;
            custom_err_message = 'User data not found';
            custom_err_title = 'NOT FOUND'
        }
        const valid_auth_user = await admin.auth().getUser(user_object._id);
        if(!valid_auth_user){
            custom_statusCode = 401;
            custom_err_message = 'Invalid auth user hash';
            custom_err_title = 'UNAUTHORIZED';
        } else if(valid_auth_user) {
            const user_online = connections.get(user_object._id)
            if(!user_online){
                return false
            } else {
                return true
            }
        }
    } catch(err){
        throw Error(JSON.stringify({
            status: custom_statusCode || 500,
            title: custom_err_title || 'SERVER ERROR',
            message: custom_err_message || 'Unable to save chat to the DB',
            stack: err.stack
        }));
    }
}
/**
 * Function to send the Widget Installed status
 */
const widgetInstallStatus = async(user_hash, data) => {
    try{
        // fetch the user with his hash
        const current_user = await User.findOne({ user_access: user_hash });
        if(!current_user){
            custom_statusCode = 404;
            custom_err_message = 'User data not found';
            custom_err_title = 'NOT FOUND'
        }
        // send the widget status
        sendAdminSSEInfo('widget_status', current_user._id, data);
    } catch(err){
        throw Error(JSON.stringify({
            status: custom_statusCode || 500,
            title: custom_err_title || 'SERVER ERROR',
            message: custom_err_message || 'Unable to save chat to the DB',
            stack: err.stack
        }));
    }
}

export { 
    sendAdminFreshUpdatedInfo, 
    sendAdminSSEInfo,
    sendWidgetVisitorNotifications, 
    fetchAllAdminVisitor, 
    fetchAllAdminNotification, 
    fetchAdminAnalyticsData, 
    adminLogInStatus,
    widgetInstallStatus
}