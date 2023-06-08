import { WebSocketServer, WebSocket } from 'ws';
import { decodeJWT } from '../utils/manageVisitors.js';
import { validUserAcess } from '../utils/manageVisitors.js';

export const webSocketServerSetUp = (server) => {

    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', async(req, socket, head) => {
        try{
            // check if the token is set in the authorization header
            if(!!req.headers.authorization){
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }
            // get the user's hash
            const user_hash = await validUserAcess(req.params.id)
            // get the JWT 
            const token = req.headers.authorization.split(' ')[1]
            // dont connect if not valid
            if(!user_hash || !token) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }
            // decode the JWt
            const decodedJWT = await decodeJWT(token)
            if(decodedJWT && user_hash){
                wss.handleUpgrade(req, socket, head, (ws) => {
                    socket.removeListener('error', () => {
                        console.log('error')
                    });
                    wss.emit('connection', ws, req);
                    socket.on('error', (error) => {
                        console.log(error)
                    });
                });
            }
        } catch(err){
            console.log(err)
            socket.destroy();
        }
    });
    
    wss.on('connection', (ws, req) => {
        ws.on('error', (error) => {
            console.log(error)
        });
    
        ws.on('message', (msg, isBinary) => {
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

