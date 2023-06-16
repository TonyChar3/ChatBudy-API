import { WebSocketServer, WebSocket } from 'ws';
import { decodeJWT } from '../utils/manageVisitors.js';
import Chatroom from '../models/chatRoomModels.js';
import redis from 'redis';
import dotenv from 'dotenv';
import { promisify } from 'util';

dotenv.config();

export const webSocketServerSetUp = (server) => {

    const connections = new Map();// Map to track the connections

    const wss = new WebSocketServer({ noServer: true });
    // set to the general scope the visitor ID
    let visitorID;
    let userHash;

    const REDIS_PORT = process.env.REDIS_PORT
    const client = redis.createClient({
        host: '127.0.0.1',
        port: REDIS_PORT
    });
    client.on("error", (error) => console.error(`Error: ${error}`));
        

    server.on('upgrade', async(req, socket, head) => {
        try{
            await client.connect()
            const jwt_connect = new URL(req.url, 'http://localhost:8080').searchParams.get('id');
            const decodeT = await decodeJWT(jwt_connect, 'WS');
            if(!decodeT.id || !decodeT.userHash) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            } else if(decodeT.id && decodeT.userHash) {
                // fetch the chatroom
                const chat_room = await Chatroom.findById(decodeT.userHash)
                if(chat_room){
                    const room_index = chat_room.chat_rooms.findIndex(rooms => rooms.visitor.toString() === decodeT.id);
                    if(room_index !== -1){
                        userHash = decodeT.userHash
                        visitorID = decodeT.id
                        connections.set(decodeT.userHash, chat_room.chat_rooms[room_index])
                        await client.set(decodeT.userHash,JSON.stringify(chat_room.chat_rooms[room_index]))
                        wss.handleUpgrade(req, socket, head, (ws) => {
                            socket.removeListener('error', () => {
                                console.log('error')
                            });
                            wss.emit('connection', ws, req);
                            socket.on('error', (error) => {
                                console.log(error)
                            });
                        });
                    } else {
                        socket.write('HTTP/1.1 404 Not found\r\n\r\n');
                        socket.destroy();
                        return;
                    }
                }
            }
        } catch(err){
            console.log(err)
            socket.destroy();
        }
    });
    
    wss.on('connection', (ws, req) => {
        console.log('connection opened')
        console.log(connections)
        const ws_chatroom = connections.get(userHash, visitorID)
        ws.send(JSON.stringify(ws_chatroom.messages))
        ws.on('error', (error) => {
            console.log(error)
        });
    
        ws.on('message', (msg, isBinary) => {
            wss.clients.forEach((client) => {
                if(client.readyState === WebSocket.OPEN) {
                    const current_connection = connections.get(userHash, visitorID)
                    const received_msg = JSON.parse(msg)
                    let new_msg = {}

                    switch(received_msg.senderType){
                        case "visitor":
                            new_msg = {
                                text: received_msg.content,
                                sent_by: current_connection.visitor
                            }
                            break;
                        case "agent":
                            new_msg = {
                                text: received_msg.content,
                                sent_by: userHash
                            }
                            break;
                        default:
                            break;
                    }
                    if(Object.keys(new_msg).length !== 0){
                        console.log('New set msg', new_msg)
                        // add it to the map Object messages array []
                        // cache it inside Redis server
                        // send it to the front-end
                        // perform the async fetch request to add it to the db
                            // once completed just send it back to the client
                            client.send(msg, { binary: isBinary });
                    }
                }
            });
        });
        ws.on('close', () => {
            console.log('connection close')
        });
    });
}

