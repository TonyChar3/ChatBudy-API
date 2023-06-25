import { MaxKey, MinKey } from 'mongodb';
import Chatroom from '../models/chatRoomModels.js';
import dotenv from 'dotenv';


dotenv.config();

let new_msg = [];
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
                    console.log("updated...", room_exist)
                    break;
                } else if(!room_exist){
                    chat_rooms.set(visitor_id, [new_chat])
                    console.log("new chat:", chat_rooms)
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
 * Function to check the cache and always make sure it exist before caching a new one
 */
const verifyCache = async(client, visitor_id, chat_obj) => {
    try{
        const visitor_cache = await client.get(visitor_id)
        if(visitor_cache){
            // if found in the cache just return
            return visitor_cache
            // return visitor_cache
        } else if(!visitor_cache && chat_obj) {
            // if not found cache it and return
            await client.set(visitor_id, JSON.stringify(chat_obj));
            return
        }
    } catch(err){
        console.log(err)
    }
}

export { saveChat, verifyCache }