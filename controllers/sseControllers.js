import asyncHandler from 'express-async-handler';
import admin from 'firebase-admin';

const connections = new Map()

//@desc Route grant access to the SSE connection
const AuthSSEconnection = asyncHandler(async(req,res,next) => {
    try{
        const token = req.headers.authorization.split(' ')[1];

        const decodeToken = await admin.auth().verifyIdToken(token);
    
        if(decodeToken) {
            const userID = decodeToken.uid

            req.session.user = userID
            
            res.status(201).json({ message: "SSE connection granted"})
        }
    } catch(err){
        console.log(err)
        next(err)
    }
})

//@desc Route to initiate the SSE connection
//@route GET /sse
//@access PRIVATE
const SSEconnection = asyncHandler(async(req,res,next) => {

    try{
        const userID = req.session.user

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5173');
    
        res.write('SSE connection started\n\n');
        connections.set(userID, res);

        res.on('close', () => {
            connections.delete(userID);
        });

    } catch(err){
        console.log(err)
        next(err)
    }
});

/**
 * Function to send updates to the font-end client
 */
const sendUpdateToUser = (user_id, data) => {
    const connection = connections.get(user_id);

    if(connection) {
        connection.write(`data: ${JSON.stringify(data)}\n\n`)
    }
}


export { SSEconnection, sendUpdateToUser, AuthSSEconnection }