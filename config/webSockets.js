import { WebSocketServer } from 'ws';
import { decodeJWT, setVisitorEmail } from '../utils/manageVisitors.js';
import { saveChat, checkAndSetWSchatRoom, sendWsUserNotification, cacheSentChat, askEmailForm, setConversionRate } from '../utils/manageChatRoom.js';
import dotenv from 'dotenv';
import { adminLogInStatus } from '../utils/manageSSE.js';

dotenv.config();

let visitorID;
let userHash;
let user_type_login;

let user_ws_connected;
let data_to_send = null;

export const webSocketServerSetUp = (redis_client, server) => {
    const chatrooms_map = new Map();// Map to track the chatrooms object
    const wss_connections = new Map();//Map to track the right WebSocket connections
    const wss = new WebSocketServer({ noServer: true });// start new WebSocket server

    server.on('upgrade', async(req, socket, head) => {
        try{
            const jwt_connect = new URL(req.url, 'http://localhost:8080').searchParams.get('id');
            const decode_token = await decodeJWT(jwt_connect, 'WS');
            // Decode the sent JWT and check if the data inside is valid
            if(!decode_token.id || !decode_token.userHash) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return false;
            }
            // set the variables
            userHash = decode_token.userHash
            visitorID = decode_token.id
            user_type_login = decode_token.logIN
            // check the cache and set the chatroom
            const check_for_chatroom = await checkAndSetWSchatRoom("Visitor_chat", redis_client, visitorID, userHash, chatrooms_map);
            if(check_for_chatroom.error){
                console.log(check_for_chatroom.error_msg);
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

    wss.on('connection',async(ws,req) => {
        ws["id"] = visitorID
        const ws_chatroom = chatrooms_map.get(visitorID)
        const ask_email = await askEmailForm(userHash, visitorID);
        const connect_user_array = wss_connections.get(visitorID) || [];
        connect_user_array.push({ id: user_type_login, ws: ws });// set a new connected user into the array
        wss_connections.set(visitorID, connect_user_array);

        if(user_type_login === visitorID){
            // check if the visitor email is set
            if(!ask_email){
                data_to_send = JSON.stringify({ type: 'ask-email', status: ask_email })
            } else {
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

            switch (received_msg.type || received_msg.senderType){
                case 'typing':
                    if(ws.id.toString() === ws_chatroom.visitor.toString()){
                        // Broadcast the message to all connected clients except the sender
                        user_ws_connected.forEach(client => {
                            if (client.ws !== ws) {
                                client.ws.send(JSON.stringify({ type: '...', status: received_msg.status }), { binary: isBinary });
                            }
                        });
                    }
                    break;

                case 'set-email':
                    setConversionRate(userHash);// increment the conversion data count
                    const sanitized_value = received_msg.visitor_email.replace(/[^\w\s@.\-]/gi, '');
                    if(sanitized_value){
                        const set_email = await setVisitorEmail(userHash, visitorID, sanitized_value)
                        if(set_email){
                            ws.send(JSON.stringify(ws_chatroom.messages));
                            // send a new notification
                            sendWsUserNotification('admin', userHash, visitorID, { 
                                sent_from: 'Admin', 
                                title: `${visitorID} has set a new email`, 
                                content: `the new email: ${sanitized_value}` 
                            });
                        }
                    } else if (!sanitized_value){
                        const dummy_email = `#${visitorID}`;
                        const set_dummy_email = await setVisitorEmail(userHash, visitorID, dummy_email);
                        if(!set_dummy_email){
                            console.log('ERROR setting the dummy email for the visitor');
                            break;
                        }
                        ws.send(JSON.stringify(ws_chatroom.messages));
                        // notify the admin 
                        sendWsUserNotification('admin', userHash, visitorID, {
                            sent_from: 'Admin',
                            title: `${visitorID} has refused to provide his email`,
                            content: 'No email provided from the visitor'
                        });
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
                                    sendWsUserNotification('admin', userHash, visitorID, {
                                        sent_from: visitorID,
                                        title: `${visitorID} has sent you a new chat`,
                                        content: received_msg.content,
                                        action: visitorID
                                    });
                                    break;
                                case userHash:
                                    sendWsUserNotification('visitor', userHash, visitorID, {
                                        sent_from: 'Agent',
                                        title: `New chat from support`,
                                        content: received_msg.content
                                    });
                                    break;
                                default:
                                    break;
                            }
                        })
                    }
                }
                // cache and save the chat
                cacheSentChat(redis_client, userHash, ws.id, ws_chatroom, new_msg);
                new_msg = {}
            }
        });
        ws.on('error', async(error) => {
            await saveChat('SAVE', userHash, ws.id);
            ws.close();
        });
        ws.on('close', async() => {
            await saveChat('SAVE', userHash, ws.id);
            const rogue_ws_connection = wss_connections.get(visitorID);
            const updated_remove_ws = rogue_ws_connection.filter((connection) => connection.ws !== ws);
            wss_connections.set(visitorID, updated_remove_ws);
        });
    });
}

