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
const saveDBChat = async(visitor_id, user_hash, chat_array) => {
    try{
        // find the room
        const user_collection = await Chatroom.findById(user_hash);
        if(!user_collection){
            throw new Error('ERROR saveDBChat(): Unable to find room to save and update...');
        }
        // find the visitor convo
        const visitor_convo = user_collection.chat_rooms.findIndex(rooms => rooms.visitor.toString() === visitor_id.toString());
        if(visitor_convo === -1){
            throw new Error('ERROR saveDBChat(): Unable to find this visitor...please try again');
        }
        chat_array.forEach(msg => {
            user_collection.chat_rooms[visitor_convo].messages.push(msg);
        });
        // save modifications...
        const save_chat = await user_collection.save();
        if(!save_chat){
            throw new Error('ERROR saveDBChat(): Unable to save the chat to the DB...');
        }
        // delete the chatroom from the Map()
        chat_rooms.delete(visitor_id);
        return true
    } catch(err){
        console.log('ERROR saveDBChat()');
        throw new Error(`ERROR saveDBChat(): ${err}`);
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
                    const db_save = await saveDBChat(visitor_id, user_hash, chat_array);
                    if(!db_save){
                        throw new Error('ERROR saveChat(): unable to save to DB the chat messages...');
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
                const db_save = await saveDBChat(key, user_hash, array);
                if(!db_save){
                    throw new Error('ERROR saveChat(): unable to save to the DB...');
                }
                return true;
            }
        }); 
    } catch(err){
        console.log('ERROR saveChat()');
        throw new Error(`ERROR saveChat(): ${err}`);
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
            const caching_msg = await redis_client.set(ws_id, JSON.stringify(ws_chatroom), 'EX', 1800);
            if(!caching_msg){
                throw new Error('ERROR cacheSentChat(): Unable to cache the message');
            }
        }
    }catch(err){
        console.log('ERROR cacheSetnChat()');
        throw new Error(`ERROR cacheSetnChat(): ${err}`);
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
        console.log('ERROR verifyCache()');
        throw new Error(`ERROR verifyCache(): ${err}`);
    }
}
/**
 * Function to check and set the chatroom in the WebSocket server
 */
const checkAndSetWSchatRoom = async(cache_key_name, redis_client, visitor_id, user_hash, connection_map) => {
    try{
        // cache_key_name =  Visitor_chat
        const chat_room_cache = await verifyCache(cache_key_name,redis_client, visitor_id);
        if(!chat_room_cache){
            // fetch the chatroom
            const chat_room_collection = await Chatroom.findById(user_hash);
            if(!chat_room_collection){
                throw new Error('ERROR checkAndSetWSchatRoom(): chatroom collection not found()');
            }
            const room_index = chat_room_collection.chat_rooms.findIndex(rooms => rooms.visitor.toString() === visitor_id.toString());
            if(room_index === -1){
                throw new Error('ERROR checkAndSetWSchatRoom(): room index not found in the collection chatrooms array');
            }
            connection_map.set(visitor_id, chat_room_collection.chat_rooms[room_index]);
            await verifyCache(cache_key_name,redis_client, visitor_id, chat_room_collection.chat_rooms[room_index]);
            return { message: 'room was set'}
        }
        // if it was found in the cache
        if(!connection_map.get(visitor_id)){
            connection_map.set(visitor_id, JSON.parse(chat_room_cache));
        }
        return { message: 'room found and set'}
    } catch(err){
        console.log('ERROR checkAndSetWSchatRoom()');
        throw new Error(`ERROR checkAndSetWSchatRoom(): ${err}`);
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
                if(!visitor_collection){
                    throw new Error("ERROR sendNotification(): Visitor notifications not found... try again");
                }
                // find the visitor index in the array
                const visitor_index = visitor_collection.visitor.findIndex(visitor => visitor._id.toString() === client_id);
                if(visitor_index === -1){
                    throw new Error('ERROR sendNotification(): No visitors found to notify... please try again');
                }
                // update his notification array
                const visitor = visitor_collection.visitor[visitor_index]
                const visitor_notif_array = visitor.notifications
                visitor.notifications.push(notif_object);
                // save it
                const add_notification = await visitor_collection.save();
                if(!add_notification){
                    throw new Error("ERROR sendNotification(): Unable to notify the visitor...please try again");
                }
                sendWidgetVisitorNotifications(visitor._id, visitor_notif_array);
                break;
            case "admin":
                // check the user collection
                const user = await User.findOne({ user_access: user_hash });
                if(!user){
                    throw new Error('ERROR sendNotification(): Admin unable to find the user to notify... please try again');
                }
                const admin_notif_array = user.notification
                const update_array = await user.updateOne({
                    $push: {
                      notification: {
                        $each: [notif_object],
                        $position: 0
                      }
                    }
                });
                if(!update_array){
                    throw new Error('ERROR sendNotification(): Admin unable to notify... try again');
                }
                // Send the notification to the frontend
                admin_notif_array.unshift(notif_object);
                sendAdminSSEInfo('notification', user._id, admin_notif_array);
                break; 
            default: 
                break;
        }
    }catch(err){
        console.log('ERROR sendNotification()');
        throw new Error(`ERROR sendNotification(): ${err}`);
    }
}
/**
 * Function to verify if we need to ask for the visitor email or no
 */
const askEmailForm = async(user_hash, visitor_id) => {
    try{
        // fetch the visitor from the DB
        const visitor_collection = await Visitors.findById(user_hash);
        if(!visitor_collection){
            throw new Error("ERROR askEmailForm(): Set visitor email function ERROR: Unable to find the visitor collection");
        }
        // find the specific visitor object
        const visitor_index = visitor_collection.visitor.findIndex(visitors => visitors.id.toString() === visitor_id.toString());
        if(visitor_index === -1){
            throw new Error("ERROR askEmailForm(): Set visitor email function ERROR: Unable to find the visitor in the array");
        }
        // visitor got no email -> make the ws send the form 
        if(!visitor_collection.visitor[visitor_index].email){
            return false
        }
        // visitor got his email -> just continue like normal
        return true
    } catch(err){
        console.log('ERROR askEmailForm()');
        throw new Error(`ERROR askEmailForm(): ${err}`);
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
        if(!chatroom_collection){
            throw new Error('ERROR SetConversionRate(): Unable to find the user chatroom collection');
        }
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
        console.log('ERROR setConversionRate()');
        throw new Error(`ERROR setConversionRate() ${err}`);
    }
}

export { saveChat, verifyCache, sendWsUserNotification, cacheSentChat, askEmailForm, checkAndSetWSchatRoom, setConversionRate }