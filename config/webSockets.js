import { WebSocketServer, WebSocket } from 'ws';
import { decodeJWT } from '../utils/manageVisitors.js';
import { saveChat, verifyCache } from '../utils/manageChatRoom.js';
import Chatroom from '../models/chatRoomModels.js';
import dotenv from 'dotenv';

dotenv.config();

export const webSocketServerSetUp = (redis_client, server) => {
    // set to the general scope the visitor ID
    let visitorID;
    let userHash;

    const connections = new Map();// Map to track the connections
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', async(req, socket, head) => {
        try{
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
                    connections.set(decodeT.id, JSON.parse(chat_room_cache))
                    console.log('cached room')
                } else if(!chat_room_cache){
                    // fetch the chatroom
                    const chat_room = await Chatroom.findById(decodeT.userHash)
                    if(chat_room){
                        const room_index = chat_room.chat_rooms.findIndex(rooms => rooms.visitor.toString() === decodeT.id.toString());
                        if(room_index !== -1){
                            userHash = decodeT.userHash
                            visitorID = decodeT.id
                            connections.set(decodeT.id, chat_room.chat_rooms[room_index])
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
                    }
                }
            }
        } catch(err){
            console.log(err)
            socket.write('HTTP/1.1 404 Not found\r\n\r\n');
            socket.destroy();
        }
    });
    
    wss.on('connection',(ws, req) => {
        let new_msg = {}
        const ws_chatroom = connections.get(visitorID)
        ws["room"] = ws_chatroom

        ws_chatroom.messages.forEach(element => {
            ws.send(JSON.stringify(element))
        })
        ws.on('message', async(msg, isBinary) => {
            if(ws.readyState === WebSocket.OPEN){
                const received_msg = JSON.parse(msg)
                switch(received_msg.senderType){
                    case "visitor":
                        new_msg = {
                            text: received_msg.content,
                            sent_by: ws_chatroom.visitor,
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
                    if(ws.room.visitor.toString() === new_msg.sent_by.toString()){
                        ws_chatroom.messages.push(new_msg)
                        // send it to the front-end
                        ws.send(JSON.stringify(new_msg), { binary: isBinary });
                    }
                }
            }
            try{
                await saveChat('ADD', userHash, ws.room.visitor, new_msg)
                // cache it inside Redis server
                const caching_msg = await redis_client.set(ws.room.visitor, JSON.stringify(ws_chatroom), 'EX', 86400)
                if(caching_msg){
                    console.log('New message cached')
                }
            }catch(err){
                console.log(err)
                ws.close()
            }
        });
        ws.on('error', async(error) => {
            await saveChat('SAVE', userHash, ws.room.visitor)
            console.log(error);
            ws.close();
        });
        ws.on('close', async() => {
            await saveChat('SAVE', userHash, ws.room.visitor)
        });
    });
}
