import { WebSocketServer, WebSocket } from 'ws';
import { decodeJWT } from '../utils/manageVisitors.js';
import { saveChat, verifyCache } from '../utils/manageChatRoom.js';
import Chatroom from '../models/chatRoomModels.js';
import redis from 'redis';
import dotenv from 'dotenv';

dotenv.config();

export const webSocketServerSetUp = (server) => {
    // set to the general scope the visitor ID
    let visitorID;
    let userHash;

    const REDIS_PORT = process.env.REDIS_PORT

    const connections = new Map();// Map to track the connections
    const wss = new WebSocketServer({ noServer: true });

    const redis_client = redis.createClient({
        host: '127.0.0.1',
        port: REDIS_PORT
    });

    redis_client.on("error", (error) => console.error(`Redis Error: ${error}`));

    server.on('upgrade', async(req, socket, head) => {
        try{
            await redis_client.connect()
            const jwt_connect = new URL(req.url, 'http://localhost:8080').searchParams.get('id');
            const decodeT = await decodeJWT(jwt_connect, 'WS');

            if(!decodeT.id || !decodeT.userHash) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            } else if(decodeT.id && decodeT.userHash) {
                // check the cache
                const chat_room_cache = await verifyCache(redis_client, decodeT.id)
                if(chat_room_cache){
                    userHash = decodeT.userHash
                    visitorID = decodeT.id
                    connections.set(decodeT.userHash, JSON.parse(chat_room_cache))
                    console.log('cached room')
                } else if(!chat_room_cache){
                    // fetch the chatroom
                    const chat_room = await Chatroom.findById(decodeT.userHash)
                    if(chat_room){
                        const room_index = chat_room.chat_rooms.findIndex(rooms => rooms.visitor.toString() === decodeT.id);
                        if(room_index !== -1){
                            userHash = decodeT.userHash
                            visitorID = decodeT.id
                            connections.set(decodeT.userHash, chat_room.chat_rooms[room_index])
                            await verifyCache(redis_client, decodeT.id, chat_room.chat_rooms[room_index])
                            console.log('freshly fetched room')
                        } 
                    }
                }
                if(connections){
                    try{
                        wss.handleUpgrade(req, socket, head, (ws) => {
                            socket.removeListener('error', () => {
                                console.log('error')
                            });
                            wss.emit('connection', ws, req);
                            socket.on('error', (error) => {
                                console.log(error)
                            });
                        });
                    } catch(err){
                        console.log(err)
                        socket.destroy();
                        redis_client.quit();
                    }
                }
            }
        } catch(err){
            console.log(err)
            socket.write('HTTP/1.1 404 Not found\r\n\r\n');
            socket.destroy();
            redis_client.quit();
        }
    });
    
    wss.on('connection', (ws, req) => {
        const ws_chatroom = connections.get(userHash, visitorID)
        let new_msg = {}
        ws_chatroom.messages.forEach(element => {
            ws.send(JSON.stringify(element))
        })
        ws.on('error', async(error) => {
            await saveChat('SAVE', userHash, visitorID)
            redis_client.quit();
            console.log(error);
        });
        ws.on('message', async(msg, isBinary) => {
            const current_connection = connections.get(userHash, visitorID)
            wss.clients.forEach((client) => {
                if(client.readyState === WebSocket.OPEN){
                    const received_msg = JSON.parse(msg)

                    switch(received_msg.senderType){
                        case "visitor":
                            new_msg = {
                                text: received_msg.content,
                                sent_by: current_connection.visitor,
                                sender_type: received_msg.senderType
                            }
                            break;
                        case "agent":
                            new_msg = {
                                text: received_msg.content,
                                sent_by: userHash,
                                sender_type: received_msg.senderType
                            }
                            break;
                        default:
                            break;
                    }
                    if(Object.keys(new_msg).length !== 0){
                        // add it to the map Object messages array []
                        current_connection.messages.push(new_msg)
                        // send it to the front-end
                        client.send(JSON.stringify(new_msg), { binary: isBinary });
                    }
                }
            });
            try{
                await saveChat('ADD', userHash, visitorID, new_msg)
                // cache it inside Redis server
                const caching_msg = await redis_client.set(visitorID, JSON.stringify(current_connection), 'EX', 86400)
                if(caching_msg){
                    console.log('New message cached')
                }
            }catch(err){
                console.log(err)
            }
        });
        ws.on('close', async() => {
            await saveChat('SAVE', userHash, visitorID)
            redis_client.quit();
        });
    });
}

