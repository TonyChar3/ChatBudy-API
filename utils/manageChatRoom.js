import Chatroom from '../models/chatRoomModels.js';
import Visitors from '../models/visitorsModels.js';
import User from '../models/userModels.js';
import dotenv from 'dotenv';
import { sendAdminSSEInfo, sendWidgetVisitorNotifications } from './manageSSE.js';
// use .env variables
dotenv.config();

const chat_rooms = new Map();

/**
 * Write the new messages in the DB
 */
const databaseChatSave = async(visitor_id, user_hash, chat_array) => {
    try{
        // find the room
        const chatroom_collection = await Chatroom.findById(user_hash);
        // find the visitor convo
        const visitor_convo = chatroom_collection.chat_rooms.findIndex(rooms => rooms.visitor.toString() === visitor_id.toString());
        chat_array.forEach(msg => {
            chatroom_collection.chat_rooms[visitor_convo].messages.push(msg);
        });
        // save modifications...
        await chatroom_collection.save();
        // delete the chatroom from the Map()
        chat_rooms.delete(visitor_id);
        return true
    } catch(err){
        console.log('saveDBChat() at manageChatRoom.js in utils: Unable to save new chat to the DB. ', err.stack);
        return {
            error: true,
            error_msg: 'saveDBChat() at manageChatRoom.js in utils: Unable to save new chat to the DB',
            error_stack: err.stack || 'NO STACK TRACE'
        }
    }
}
/**
 * Function to save the new chat messages to the persistant storage
 */
const saveChat = async(method, user_hash, visitor_id, new_chat) => {
    // get the Batch maximum number
    const BATCH_MAX = process.env.MAX_BATCH_SIZE
    try{
        switch (method){
            case 'ADD':
                const room_exist = chat_rooms.get(visitor_id);
                // If the room isnt found...
                if(!room_exist){
                    // set a new one
                    chat_rooms.set(visitor_id, [new_chat]);
                    break;
                }
                // push the room
                room_exist.push(new_chat);
                break;
            case 'SAVE':
                const chat_array = chat_rooms.get(visitor_id);
                if(Array.isArray(chat_array) && chat_array.length > 0){
                    // save it to the DB
                    const db_save = await databaseChatSave(visitor_id, user_hash, chat_array);
                    if(db_save.error){
                        return db_save;
                    }
                    return true
                }
                break;
            default:
                break;
        }
        chat_rooms.forEach(async(array,key) => {
            if(array.length >= BATCH_MAX){
                // save it to the DB
                const db_save = await databaseChatSave(key, user_hash, array);
                if(db_save.error){
                    return db_save;
                }
                return true;
            }
        }); 
    } catch(err){
        console.log('saveChat() at manageChatRoom.js in utils folder: Unable to save or add new chat messages. ', err.stack);
        return {
            error: true,
            error_msg: 'saveChat() at manageChatRoom.js in utils folder: Unable to save or add new chat messages',
            error_stack: err.stack || 'NO STACK TRACE.'
        }
    }
}
/**
 * Cache a sent message to the Redis chatroom instance
 */
const cacheSentChat = async(redis_client, user_hash, ws_id, ws_chatroom, new_msg_obj) => {
    try{
        if(Object.keys(new_msg_obj).length > 0){
            await saveChat('ADD', user_hash, ws_id, new_msg_obj);
            // cache it inside Redis server
            await redis_client.set(ws_id, JSON.stringify(ws_chatroom), 'EX', 1800);
        }
    }catch(err){
        console.log('cacheSentChat() at manageChatRoom.js in utils: Unable to cache new sent messages in the Redis cache. ', err.stack);
        return {
            error: true,
            error_msg: 'cacheSentChat() at manageChatRoom.js in utils: Unable to cache new sent messages in the Redis cache',
            error_stack: err.stack || 'NO STACK TRACE.'
        }
    }
}
/**
 * Function to check the cache and always make sure it exist before caching a new one
 */
const verifyCache = async(verify_mode, client, visitor_id, chat_obj) => {
    try{
        switch (verify_mode){
            case "Visitor_chat":
                const visitor_cache = await client.get(visitor_id);
                if(!visitor_cache && chat_obj) {
                    // select the correct Redis instance
                    client.select(0);
                    // if not found cache it and return
                    await client.set(visitor_id, JSON.stringify(chat_obj), "EX", 3600);
                    return
                }
                // if found in the cache just return
                return visitor_cache
            
            case "User_chat":
                const cached_room = await client.get(visitor_id);
                if(!cached_room){
                    return false;
                }
                return cached_room;
            default:
                break;
        }
    } catch(err){
        console.log('verifyCache() at manageChatRoom.js in utils: Unable to verify the cache in the Redis cache.', err.stack);
        return {
            error: true,
            error_msg: 'verifyCache() at manageChatRoom.js in utils: Unable to verify the cache in the Redis cache',
            error_stack: err.stack || 'NO STACK TRACE.'
        }
    }
}
/**
 * Function to check and set the chatroom in the WebSocket server
 */
const checkAndSetWSchatRoom = async(cache_key_name, redis_client, visitor_id, user_hash) => {
    try{
        // cache_key_name =  Visitor_chat
        const chat_room_cache = await verifyCache(cache_key_name,redis_client, visitor_id);
        if(!chat_room_cache){
            // fetch the chatroom
            const chat_room_collection = await Chatroom.findById(user_hash);
            // find room index in the array of chatrooms
            const room_index = chat_room_collection.chat_rooms.findIndex(rooms => rooms.visitor.toString() === visitor_id.toString());
            // verify the cache
            await verifyCache(cache_key_name,redis_client, visitor_id, chat_room_collection.chat_rooms[room_index]);
            return { visitor_id: visitor_id, chat_room: chat_room_collection.chat_rooms[room_index] }
        }
        return { visitor_id: visitor_id, chat_room: chat_room_cache }
    } catch(err){
        console.log('checkAndSetWSchatRoom() at manageChatRoom.js in utils: Unable to check and set a new chatroom for the websocket connection.', err.stack);
        return {
            error: true,
            error_msg: 'checkAndSetWSchatRoom() at manageChatRoom.js in utils: Unable to check and set a new chatroom for the websocket connection.',
            error_stack: err.stack || 'NO STACK TRACE.'
        }
    }
}
/**
 * Function to send notification
 */
const sendWsUserNotification = async(client_type, user_hash, client_id, notif_object) => {
    try{
        switch (client_type){
            case "visitor":
                // check the visitor collection
                const visitor_collection = await Visitors.findById(user_hash);
                // find the visitor index in the array
                const visitor_index = visitor_collection.visitor.findIndex(visitor => visitor._id.toString() === client_id);
                // update his notification array
                const visitor = visitor_collection.visitor[visitor_index]
                const visitor_notif_array = visitor.notifications
                visitor.notifications.push(notif_object);
                // save DB modifications
                await visitor_collection.save();
                // send update through the visitor SSE
                sendWidgetVisitorNotifications(visitor._id, visitor_notif_array);
                break;
            case "admin":
                // check the user collection
                const user = await User.findOne({ user_access: user_hash });
                const admin_notif_array = user.notification
                // update and save DB modification 
                await user.updateOne({
                    $push: {
                      notification: {
                        $each: [notif_object],
                        $position: 0
                      }
                    }
                });
                // Send the notification to the frontend
                admin_notif_array.unshift(notif_object);
                // send update through the Admin SSE
                sendAdminSSEInfo('notification', user._id, admin_notif_array);
                break; 
            default: 
                break;
        }
    }catch(err){
        console.log('sendWsUserNotification() at manageChatRoom.js in utils: Cannot send and set a new notification for the offline user.', err.stack);
        return {
            error: true,
            error_msg: 'sendWsUserNotification() at manageChatRoom.js in utils: Cannot send and set a new notification for the offline user.',
            error_stack: err.stack || 'NO STACK TRACE.'
        }
    }
}
/**
 * Function to verify if we need to ask for the visitor email or no
 */
const askEmailForm = async(user_hash, visitor_id) => {
    try{
        // fetch the visitor from the DB
        const visitor_collection = await Visitors.findById(user_hash);
        // find the specific visitor object
        const visitor_index = visitor_collection.visitor.findIndex(visitors => visitors.id.toString() === visitor_id.toString());
        // visitor got no email -> make the ws send the form 
        if(!visitor_collection.visitor[visitor_index].email){
            return false
        }
        // visitor got his email -> just continue like normal
        return true
    } catch(err){
        console.log('askEmailForm() at manageChatRoom.js in utils: Cannot see if the visitor needs to be prompt for email or no. ', err.stack);
        return {
            error: true,
            error_msg: 'askEmailForm() at manageChatRoom.js in utils: Cannot see if the visitor needs to be prompt for email or no.',
            error_stack: err.stack || 'NO STACK TRACE.'
        }
    }
}
/**
 * Function to add to the conversion rate data 
 */
const setConversionRate = async(user_hash) => {
    try{
        const today = new Date(); // Get today's date
        // find the chatroom collection
        const chatroom_collection = await Chatroom.findById(user_hash);
        // find the index of an object that matches todays date
        const conversion_object_index = chatroom_collection.conversionData.findIndex((objects) => objects.createdAt.toDateString() === today.toDateString());
        // if found just increment by 1 the count of object
        if(conversion_object_index !== -1){
            // increment the count
            chatroom_collection.conversionData[conversion_object_index].conversion_count += 1
            await chatroom_collection.save();
            return
        }
        // if nothing was found just create a new conversion Data object
        chatroom_collection.conversionData.push({ conversion_count: 1 });
        await chatroom_collection.save();
        return
    } catch(err){
        console.log('setConversionRate() at manageChatRoom.js in utils: Cannot modify conversion rate data. ', err.stack);
        return {
            error: true,
            error_msg: 'setConversionRate() at manageChatRoom.js in utils: Cannot modify conversion rate data.',
            error_stack: err.stack || 'NO STACK TRACE.'
        }
    }
}

export { saveChat, verifyCache, sendWsUserNotification, cacheSentChat, askEmailForm, checkAndSetWSchatRoom, setConversionRate }