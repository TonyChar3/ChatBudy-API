import { WebSocketServer } from 'ws';
import { decodeJWT, setVisitorEmail } from '../utils/manageVisitors.js';
import { saveChat, checkAndSetWSchatRoom, sendNotification, cacheSentChat, askEmailForm } from '../utils/manageChatRoom.js';
import dotenv from 'dotenv';
import { adminLogInStatus } from '../controllers/sseControllers.js';

dotenv.config();

let visitorID;
let userHash;
let user_type_login;

let user_ws_connected;
let data_to_send = null;

export const webSocketServerSetUp = (redis_client, server) => {
    const connections = new Map();// Map to track the chatrooms object
    const wss_connections = new Map();//Map to track the right WebSocket connections
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', async(req, socket, head) => {
        try{
            const jwt_connect = new URL(req.url, 'http://localhost:8080').searchParams.get('id');
            const decodeT = await decodeJWT(jwt_connect, 'WS');
            // Decode the sent JWT and check if the data inside is valid
            if(!decodeT.id || !decodeT.userHash) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return false;
            }
            // set the variables
            userHash = decodeT.userHash
            visitorID = decodeT.id
            user_type_login = decodeT.logIN
            // check the cache and set the chatroom
            const check_for_chatroom = await checkAndSetWSchatRoom("Visitor_chat", redis_client, visitorID, userHash, connections)
            if(!check_for_chatroom.message){
                socket.write('HTTP/1.1 404 Chatroom Not found\r\n\r\n');
                socket.destroy();
                return false;
            }
            // Connect the user after auth to a WebSocket connection
            wss.handleUpgrade(req, socket, head, (ws) => {
                socket.removeListener('error', () => {
                    console.log('Error Websocket server removing listener');
                });
                wss.emit('connection', ws, req);
                socket.on('error', (error) => {
                    console.log('WebSocket server ERORR UPGRADING:', error)
                });
            });
        } catch(err){
            console.log('WebSocket server ERROR:', err)
            socket.write('HTTP/1.1 404 Not found\r\n\r\n');
            socket.destroy();
        }
    });

    wss.on('connection',async(ws, req) => {
        ws["id"] = visitorID
        const ws_chatroom = connections.get(visitorID)
        const [admin_status, ask_email] = await Promise.all([
            adminLogInStatus(userHash),
            askEmailForm(userHash, visitorID)
        ])
        // set the current-connected user
        const connected_user = {
            id: user_type_login,
            ws: ws
        }

        const connect_array = wss_connections.get(visitorID) || [];
        connect_array.push(connected_user);
        wss_connections.set(visitorID, connect_array);

        if(user_type_login === visitorID){
            // check if the visitor email is set
            if(!ask_email){
                data_to_send = JSON.stringify({ type: 'ask-email', status: ask_email })
            } else {
                data_to_send = JSON.stringify({ type: 'admin-status', status: admin_status })
                data_to_send = JSON.stringify(ws_chatroom.messages)
            }
        } else if (user_type_login === userHash){
            data_to_send = JSON.stringify(ws_chatroom.messages)
        }
        // send the required data in the ws connection
        if(data_to_send){
            ws.send(data_to_send);
        }

        ws.on('message', async(msg, isBinary) => {
            const received_msg = JSON.parse(msg)
            user_ws_connected = wss_connections.get(visitorID)
            let new_msg = {}
            let notification_obj = {};

            switch (received_msg.type || received_msg.senderType){
                case 'typing':
                    if(ws.id.toString() === ws_chatroom.visitor.toString()){
                        const message = {
                            type: '...',
                            status: received_msg.status
                        }
                        // Broadcast the message to all connected clients except the sender
                        user_ws_connected.forEach(client => {
                            if (client.ws !== ws) {
                                client.ws.send(JSON.stringify(message), { binary: isBinary });
                            }
                        });
                    }
                    break;

                case 'set-email':
                    const sanitized_value = received_msg.visitor_email.replace(/[^\w\s@.\-]/gi, '');
                    if(sanitized_value){
                        const set_email = await setVisitorEmail(userHash, visitorID, sanitized_value)
                        if(set_email){
                            ws.send(JSON.stringify(ws_chatroom.messages))
                            // notify the admin
                            notification_obj = {
                                sent_from: 'Admin',
                                title: `${visitorID} has set a new email`,
                                content: `the new email: ${sanitized_value}`
                            }
                            sendNotification('admin', userHash, visitorID, notification_obj)
                        }
                    } else if (!sanitized_value){
                        const dummy_email = `#${visitorID}`
                        const set_dummy_email = await setVisitorEmail(userHash, visitorID, dummy_email)
                        if(!set_dummy_email){
                            console.log('ERROR setting the dummy email for the visitor')
                            break;
                        }
                        ws.send(JSON.stringify(ws_chatroom.messages))
                        // notify the admin
                        notification_obj = {
                            sent_from: 'Admin',
                            title: `${visitorID} has refused to provide his email`,
                            content: 'No email provided from the visitor'
                        }
                        sendNotification('admin', userHash, visitorID, notification_obj)
                    }
                    break;

                case 'visitor':
                    new_msg = {
                        text: received_msg.content,
                        sent_by: ws_chatroom.visitor,
                        sender_type: received_msg.senderType,
                        chat_seen: false
                    }
                    break;
                case 'agent':
                    new_msg = {
                        text: received_msg.content,
                        sent_by: userHash,
                        sender_type: received_msg.senderType,
                        chat_seen: false
                    }
                    break;
                default:
                    break;
            }

            if(Object.keys(new_msg).length > 0){
                if(ws.id.toString() === ws_chatroom.visitor.toString()){
                    ws_chatroom.messages.push(new_msg)
                    // send it to the front-end
                    user_ws_connected.forEach(connections => {
                        connections.ws.send(JSON.stringify(new_msg), { binary: isBinary });
                    });
                    // notify the new chat to the missing user
                    if(user_ws_connected.length < 2){
                        user_ws_connected.forEach(connections => {
                            switch (connections.id){
                                case visitorID:
                                    notification_obj = {
                                        sent_from: visitorID,
                                        title: `${visitorID} has sent you a new chat`,
                                        content: received_msg.content,
                                        action: visitorID
                                    }
                                    sendNotification('admin', userHash, visitorID, notification_obj)
                                    break;
                                case userHash:
                                    notification_obj = {
                                        sent_from: 'Agent',
                                        title: `New chat from support`,
                                        content: received_msg.content
                                    }
                                    sendNotification('visitor', userHash, visitorID, notification_obj)
                                    break;
                                default:
                                    break;
                            }
                        })
                    }
                }
                // cache and save the chat
                cacheSentChat(redis_client, userHash, ws.id, ws_chatroom, new_msg)
                new_msg = {}
            }
        });
        ws.on('error', async(error) => {
            await saveChat('SAVE', userHash, ws.id)
            ws.close();
        });
        ws.on('close', async() => {
            await saveChat('SAVE', userHash, ws.id)
            const remove_ws = wss_connections.get(visitorID)
            const updated_remove_ws = remove_ws.filter((connection) => connection.ws !== ws);
            if(updated_remove_ws){
                wss_connections.set(visitorID, updated_remove_ws)
            }
        });
    });
}

