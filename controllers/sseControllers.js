import asyncHandler from 'express-async-handler';
import admin from 'firebase-admin';
import User from '../models/userModels.js';
import Visitor from '../models/visitorsModels.js';

const connections = new Map()
let connectedUser;

//@desc Route grant access to the SSE connection
const AuthSSEconnection = asyncHandler(async(req,res,next) => {
    try{
        const token = req.headers.authorization.split(' ')[1];

        const decodeToken = await admin.auth().verifyIdToken(token);
    
        if(decodeToken) {
            const userID = decodeToken.uid
            connectedUser = {
                id: userID,
                accessToken: token
            }
            
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
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
                
        res.write('SSE connection started\n\n');
        connections.set(connectedUser.id, res);
        fetchAllVisitor()
        
        res.on("error", (error) => {
            console.log(error)
            connections.delete(connectedUser);
        })
            
        res.on('close', () => {
            connections.delete(connectedUser);
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

/**
 * Function to send the visitors array to the front-end
 */
const fetchAllVisitor = async() => {
    try{
        if(connectedUser){
            const decodedToken = await admin.auth().verifyIdToken(connectedUser.accessToken)
            if(decodedToken){
                const user = await User.findById(decodedToken.uid)
                if(!user){
                    throw new Error("Unable to find your visitor array...please reload and try again")
                }
        
                const visitor_array = await Visitor.findById(user.user_access);
                if(!visitor_array){
                    throw new Error("Unable to find your visitor array...please reload and try again")
                }
                if(visitor_array.visitor.length > 0) {
                    sendUpdateToUser(user._id, visitor_array.visitor);
                } else {
                    sendUpdateToUser(user._id, []);
                }
            }
        }
    } catch(err){
        console.log(err);
    }
}


export { SSEconnection, sendUpdateToUser, AuthSSEconnection }