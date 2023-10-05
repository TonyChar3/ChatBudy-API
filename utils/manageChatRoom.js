import Chatroom from '../models/chatRoomModels.js';
import Visitors from '../models/visitorsModels.js';
import User from '../models/userModels.js';
import dotenv from 'dotenv';
import { sendNotificationUpdate } from '../controllers/sseControllers.js';
import { sendVisitorNotifications } from '../controllers/widgetControllers.js';

dotenv.config();

const chat_rooms = new Map();

/**
 * Function to save the new chat messages to the persistant storage
 */
const saveChat = async(method, user_hash, visitor_id, new_chat) => {
    const BATCH_MAX = process.env.MAX_BATCH_SIZE
    try{
        switch (method){
            case 'ADD':
                const room_exist = chat_rooms.get(visitor_id)
                if(room_exist){
                    room_exist.push(new_chat);
                    break;
                } else if(!room_exist){
                    chat_rooms.set(visitor_id, [new_chat])
                    break;
                }
            case 'SAVE':
                const chat_array = chat_rooms.get(visitor_id);
                if(Array.isArray(chat_array) && chat_array.length > 0){
                    // find the room
                    const user_collection = await Chatroom.findById(user_hash);
                    if(!user_collection){
                        throw new Error('Unable to find room to save and update...')
                    }
                    // find the visitor convo
                    const visitor_convo = user_collection.chat_rooms.findIndex(rooms => rooms.visitor.toString() === visitor_id.toString())
                    if(visitor_convo === -1){
                        throw new Error('Unable to find this visitor...please try again')
                    }else if(visitor_convo !== -1){
                        chat_array.forEach(msg => {
                            user_collection.chat_rooms[visitor_convo].messages.push(msg)
                        });
                        const save_chat = await user_collection.save()
                        if(save_chat){
                            chat_rooms.delete(visitor_id);
                            return true
                        } else {
                            throw new Error('Unable to save the chat to the DB...')
                        }
                    }
                }
                break;
            default:
                break;
        }
        chat_rooms.forEach(async(array,key) => {
            if(array.length >= BATCH_MAX){
                console.log('Saving....')
                // find the room
                const user_collection = await Chatroom.findById(user_hash);
                if(!user_collection){
                    throw new Error('Unable to find room to save and update...')
                }
                // find the visitor convo
                const visitor_convo = user_collection.chat_rooms.findIndex(rooms => rooms.visitor.toString() === key)
                if(visitor_convo === -1){
                    throw new Error('Unable to find this visitor...please try again')
                }else if(visitor_convo !== -1){
                    array.forEach(msg => {
                        user_collection.chat_rooms[visitor_convo].messages.push(msg)
                    })
                    const save_chat = await user_collection.save()
                    if(save_chat){
                        chat_rooms.delete(key)
                        return true
                    } else {
                        throw new Error('Unable to save the chat to the DB...')
                    }
                }
            }
        }); 
    } catch(err){
        console.log(err)
    }
}

/**
 * Functiont to cache single chat
 */
const cacheSentChat = async(redis_client, user_hash, ws_id, ws_chatroom, new_msg_obj) => {
    try{
        if(Object.keys(new_msg_obj).length > 0){
            await saveChat('ADD', user_hash, ws_id, new_msg_obj)
            // cache it inside Redis server
            const caching_msg = await redis_client.set(ws_id, JSON.stringify(ws_chatroom), 'EX', 1800)
            if(caching_msg){
                console.log('New message cached')
            }
        }
    }catch(err){
        console.log(err)
    }
}

/**
 * Function to check the cache and always make sure it exist before caching a new one
 */
const verifyCache = async(verify_mode, client, visitor_id, chat_obj) => {
    try{
        switch (verify_mode){
            case "Visitor_chat":
                const visitor_cache = await client.get(visitor_id)
                if(visitor_cache){
                    // if found in the cache just return
                    return visitor_cache
                } else if(!visitor_cache && chat_obj) {
                    client.select(0);
                    // if not found cache it and return
                    await client.set(visitor_id, JSON.stringify(chat_obj), "EX", 3600);
                    return
                }
                break;
            
            case "User_chat":
                const cached_room = await client.get(visitor_id)
                if(cached_room){
                    return cached_room
                } 
                break;

            default:
                break;
        }
    } catch(err){
        console.log(err)
    }
}

/**
 * Function to check and set the chatroom in the WebSocket server
 */
const checkAndSetWSchatRoom = async(cache_key_name, redis_client, visitor_id, user_hash, connection_map) => {
    try{
        // cache_key_name =  Visitor_chat
        const chat_room_cache = await verifyCache(cache_key_name,redis_client, visitor_id)
        if(chat_room_cache){
            if(!connection_map.get(visitor_id)){
                connection_map.set(visitor_id, JSON.parse(chat_room_cache))
            }
            return { message: 'room found and set'}
        } else if(!chat_room_cache){
            // fetch the chatroom
            const chat_room = await Chatroom.findById(user_hash)
            if(chat_room){
                const room_index = chat_room.chat_rooms.findIndex(rooms => rooms.visitor.toString() === visitor_id.toString());
                if(room_index !== -1) {
                    connection_map.set(visitor_id, chat_room.chat_rooms[room_index])
                    await verifyCache(cache_key_name,redis_client, visitor_id, chat_room.chat_rooms[room_index])
                } 
            }
            return { message: 'room found and set'}
        }
    } catch(err){
        console.log('ERROR check and set chatroom function: ', err)
    }
}

/**
 * Function to send notification
 */
const sendNotification = async(client_type, user_hash, client_id, notif_object) => {
    try{
        switch (client_type){
            case "visitor":
                // check the visitor collection
                const visitor_collection = await Visitors.findById(user_hash)
                if(!visitor_collection){
                    throw new Error("Visitor notifications not found... try again")
                }
                // find the visitor in the array
                const visitor_index = visitor_collection.visitor.findIndex(visitor => visitor._id.toString() === client_id)
                if(visitor_index === -1){
                    throw new Error('No visitors found to notify... please try again')
                }
                // upodate his notification array
                const visitor = visitor_collection.visitor[visitor_index]
                const visitor_notif_array = visitor.notifications
                visitor.notifications.push(notif_object)
                // save it
                const add_notification = await visitor_collection.save()
                if(!add_notification){
                    throw new Error("Unable to notify the visitor...please try again")
                }
                sendVisitorNotifications(visitor._id, visitor_notif_array);
                break;
            case "admin":
                // check the user collection
                const user_object = await User.findOne({ user_access: user_hash })
                if(!user_object){
                    throw new Error('Unable to find the user to notify... please try again')
                }
                const admin_notif_array = user_object.notification
                const update_array = await user_object.updateOne(  {
                    $push: {
                      notification: {
                        $each: [notif_object],
                        $position: 0
                      }
                    }
                });
                const updated_array = await User.findOne({ user_access: user_hash })
                if(!update_array){
                    throw new Error('Unable to notify... try again')
                }
                admin_notif_array.unshift(notif_object)
                sendNotificationUpdate(user_object._id, updated_array.notification)
                break; 
            default: 
                break;
        }
    }catch(err){
        console.log(err)
    }
}

/**
 * Function to ask for the email of the visitor
 */
const askEmailForm = async(user_hash, visitor_id) => {
    try{
        // fetch the visitor from the DB
        const visitor_collection = await Visitors.findById(user_hash)
        if(!visitor_collection){
            throw new Error("Set visitor email function ERROR: Unable to find the visitor collection")
        }
        // find the specific visitor object
        const visitor_index = visitor_collection.visitor.findIndex(visitors => visitors.id.toString() === visitor_id.toString());
        if(visitor_index === -1){
            throw new Error("Set visitor email function ERROR: Unable to find the visitor in the array")
        }
        // visitor got no email -> make the ws send the form 
        if(!visitor_collection.visitor[visitor_index].email){
            return false
        } else if (visitor_collection.visitor[visitor_index].email){
        // visitor got his email -> just continue like normal
            return true
        }
       
    } catch(err){
        console.log(err)
    }
}

/**
 * Function to add to the conversion rate data 
 */
const SetConversionRate = async(user_hash) => {
    try{
        const today = new Date(); // Get today's date
        // find the chatroom collection
        const chatroom_collection = await Chatroom.findById(user_hash);
        if(!chatroom_collection){
            throw new Error('ERROR SetConversionRate(): Unable to find the user chatroom collection')
        }
        // find the index of an object that matches todays date
        const conversion_object_index = chatroom_collection.conversionData.findIndex((objects) => objects.createdAt.toDateString() === today.toDateString())
        // if found just increment by 1 the count of object
        if(conversion_object_index !== -1){
            chatroom_collection.conversionData[conversion_object_index].conversion_count += 1
            await chatroom_collection.save();
            return
        }
        // if nothing was found just create a new conversion Data object
        const new_conversion = {
            conversion_count: 1
        };
        chatroom_collection.conversionData.push(new_conversion);
        await chatroom_collection.save();
        return
    } catch(err){
        console.log(err)
    }
}

export { saveChat, verifyCache, sendNotification, cacheSentChat, askEmailForm, checkAndSetWSchatRoom, SetConversionRate }