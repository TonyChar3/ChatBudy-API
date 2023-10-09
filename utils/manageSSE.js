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
        if(!user){
            throw new Error("ERROR sendAdminFreshUpdateInfo(): Send update info function ERROR: unable to find the user with the provided user hash");
        }
        // send info to the front-end
        sendAdminSSEInfo('visitor', user._id, data);
    } catch(err){
        console.log('ERROR sendAdminFreshUpdatedInfo()');
        throw new Error(`ERROR sendAdminFreshUpdatedInfo(): ${err}`);
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
                throw new Error('ERROR fetchAllAdminVisitor(): Unauthorized');
            }
            const user = await User.findById(decode_token.uid);
            if(!user){
                throw new Error("Unable to find your visitor array...please reload and try again");
            }
            const visitor_collection = await Visitors.findById(user.user_access);
            if(!visitor_collection) {
                throw new Error("Unable to find your visitor array...please reload and try again");
            }
            if(!visitor_collection.visitor.length > 0){
                sendAdminSSEInfo('visitor', user._id, []);
                return;
            }
            sendAdminSSEInfo('visitor', user._id, visitor_collection.visitor);
            return;
        }
    } catch(err){
        console.log('ERROR fetchAllAdminVisitor()');
        throw new Error(`ERROR fetchAllAdminVisitor(): ${err}`);
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
                throw new Error('ERROR fetchAllAdminNotification(): Unauthorized.');
            }
            const user = await User.findById(decode_token.uid);
            if(!user){
                throw new Error("ERROR fetchAllAdminNotification(): Unable to find your visitor array...please reload and try again");
            }
            if(!user.notification.length > 0) {
                sendAdminSSEInfo('notification', user._id, []);
                return
            }
            sendAdminSSEInfo('notification', user._id, user.notification);
            return
        }
    } catch(err){
        console.log('ERROR fetchAllAdminNotification()');
        throw new Error(`ERROR fetchAllAdminNotification(): ${err}`);
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
                throw new Error('ERROR fetchAdminAnalyticsData(): Unauthorized.');
            }
            const user = await User.findById(decode_token.uid);
            if(!user){
                throw new Error("Unable to find your visitor array...please reload and try again")
            }
            const [ chatroom_collection, visitor_collection ] = await Promise.all([
                await ChatRoom.findById(user.user_access),
                await Visitors.findById(user.user_access)
            ]);
            if(!chatroom_collection){
                throw new Error('Unable to find the chatroom collection')
            } else if (!visitor_collection){
                throw new Error('Unable to find the visitor collection')
            }
            // send the analytics data
            sendAdminSSEInfo('analytics',user._id, { 
                conversion_data: chatroom_collection.conversionData,
                visitor_data: visitor_collection.visitorData,
                browser_data: visitor_collection.browserData
            });
        }
    } catch(err){
        console.log('ERROR fetchAdminAnalyticsData()');
        throw new Error(`ERROR fetchAdminAnalyticsData(): ${err}`);
    }
}


/**
 * Function to send the Admin log in status to the widget
 */
const adminLogInStatus = async(admin_hash) => {
    try{
        const user_object = await User.findOne({ user_access: admin_hash });
        if(!user_object){
            throw new Error('ERROR adminLogInStatus(): Cannot find user...please try again');
        }
        const valid_auth_user = await admin.auth().getUser(user_object._id);
        if(!valid_auth_user){
            throw new Error('ERROR adminLogInStatus(): User not authenticated...FORBIDDEN');
        } else if(valid_auth_user) {
            const user_online = connections.get(user_object._id)
            if(!user_online){
                return false
            } else {
                return true
            }
        }
    } catch(err){
        console.log('ERROR adminLogInStatus()');
        throw new Error(`ERROR adminLogInStatus(): ${err}`);
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
            throw new Error('ERROR WidgetInstallStatus(): Unable to find the user');
        }
        // send the widget status
        sendAdminSSEInfo('widget_status', current_user._id, data);
    } catch(err){
        console.log('ERROR widgetInstallStatus()');
        throw new Error(`ERROR widgetInstallStatus(): ${err}`);
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