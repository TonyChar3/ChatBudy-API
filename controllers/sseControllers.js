import asyncHandler from 'express-async-handler';
import { fetchAllAdminVisitor, fetchAllAdminNotification, fetchAdminAnalyticsData } from '../utils/manageSSE.js';
import { VerifyFirebaseToken } from '../middleware/authHandle.js';
const connections = new Map()
let connectedUser;
let custom_err_message;
let custom_err_title;

//@desc Route grant access to the SSE connection
//@route GET /connection/auth-sse
//@access PRIVATE
const authSSEconnection = asyncHandler(async(req,res,next) => {
    try{
        const decodeToken = await VerifyFirebaseToken(req, res);
        const userID = decodeToken.uid
        const token = req.headers.authorization.split(' ')[1];
        if(!token){
            custom_err_message = 'Authorization headers not set';
            custom_err_title = 'SERVER ERROR'
        }
        connectedUser = {
            id: userID,
            accessToken: token
        }
        res.status(201).json({ message: "SSE connection granted"});
    } catch(err){
        next({ 
            statusCode: 500, 
            title: custom_err_title || 'SERVER ERROR', 
            message: custom_err_message, 
            stack: err.stack 
        });
    }
});
//@desc Route to initiate the SSE connection
//@route GET /connection/sse
//@access PRIVATE
const connectionSSE = asyncHandler(async(req,res,next) => {
    try{
        if(connectedUser){
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
                    
            res.write('SSE connection started\n\n');

            connections.set(connectedUser.id, res);
            fetchAllAdminVisitor(connectedUser);
            fetchAllAdminNotification(connectedUser);
            fetchAdminAnalyticsData(connectedUser);
            
            res.on("error", (error) => {
                custom_err_message = error.message;
                connections.delete(connectedUser.id);
            });
                
            res.on('close', () => {
                connections.delete(connectedUser.id);
            });
        }
    } catch(err){
        next({ 
            statusCode: 500, 
            title: custom_err_title || 'SERVER ERROR', 
            message: custom_err_message, 
            stack: err.stack 
        });
    }
});

export { connectionSSE, authSSEconnection, connections }