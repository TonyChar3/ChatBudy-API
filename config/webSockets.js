import { WebSocketServer, WebSocket } from 'ws';
import { decodeJWT } from '../utils/manageVisitors.js';
import { validUserAcess } from '../utils/manageVisitors.js';
import Chatroom from '../models/chatRoomModels.js';

export const webSocketServerSetUp = (server) => {

    const connections = new Map();// Map to track the connections

    const wss = new WebSocketServer({ noServer: true });
    // get the user's hash
    let userHash; 
    server.on('upgrade', async(req, socket, head) => {
        try{
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
                    const room_index = chat_room.chat_rooms.findIndex(rooms => {
                        console.log(rooms)
                    });
                    if(room_index === -1){
                        socket.destroy()
                    }
                    // if(room_index !== -1){
                    //     console.log(room_index)
                    //     // wss.handleUpgrade(req, socket, head, (ws) => {
                    //     //     socket.removeListener('error', () => {
                    //     //         console.log('error')
                    //     //     });
                    //     //     wss.emit('connection', ws, req);
                    //     //     socket.on('error', (error) => {
                    //     //         console.log(error)
                    //     //     });
                    //     // });
                    // } else {
                    //     console.log(room_index)
                    // }
                    // // } else {
                    // //     socket.write('HTTP/1.1 404 Not found\r\n\r\n');
                    // //     socket.destroy();
                    // //     return;
                    // // }

                }
            }
        } catch(err){
            console.log(err)
            socket.destroy();
        }
    });
    
    wss.on('connection', (ws, req) => {
        connections.set(userHash, ws);
        ws.on('error', (error) => {
            console.log(error)
        });
    
        ws.on('message', (msg, isBinary) => {
            console.log('connection opened')
            wss.clients.forEach((client) => {
                if(client.readyState === WebSocket.OPEN) {
                    client.send(msg, { binary: isBinary });
                }
            });
        });
    
        ws.on('close', () => {
            console.log('connection close')
        });
    });
}

