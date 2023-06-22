import asyncHandler from 'express-async-handler';
import User from '../models/userModels.js';
import Widget from '../models/widgetModels.js';
import admin from 'firebase-admin';
import Visitors from '../models/visitorsModels.js';
import ChatRoom from '../models/chatRoomModels.js';
import { uniqueUserHash } from '../utils/manageVisitors.js';

//@desc Register a new User
//@route POST /user/register
//@access PRIVATE
const registerUser = asyncHandler(async(req,res,next) => {
    try{
        const token = req.headers.authorization.split(' ')[1]
        const { web_url, username } = req.body

        const decodedToken = await admin.auth().verifyIdToken(token)

        if(decodedToken){
            
            // get the user data
            const data = await admin.auth().getUser(decodedToken.user_id)
            // generate a unique user hash
            const u_hash = await uniqueUserHash();
            if(data && u_hash){
                //create the user and insert it in the DB
                const user = await User.create({
                    _id: data.uid,
                    user_access: u_hash,
                    username: username,
                    email: data.email
                });

                // create the user widget
                const widget = await Widget.create({
                    _id: u_hash,
                    domain: web_url
                });

                // create the user visitors array in the Visitors collection
                const visitors = await Visitors.create({
                    _id: u_hash
                });

                // create the chatroom collection of the user
                const chatroom = await ChatRoom.create({
                    _id: u_hash
                });

                if(user && widget && visitors && chatroom){
                    res.status(200).json({ message: "Welcome to the Salezy App"})
                } else {
                    res.status(500);
                }
            }
        }
    } catch(err){
        next(err)
    }
});

//@desc Update the user profile
//@route PUT /user/update-profile
//@access PRIVATE
const updateProfile = asyncHandler(async(req,res,next) => {
    res.json({ message: "Update user profile..."})
});

//@desc Get the current logged in user data
//@route GET /user/current
//@access PRIVATE
const currentUser = asyncHandler(async(req,res,next) => {
    try{
        const token = req.headers.authorization.split(' ')[1]
        const decodedToken = await admin.auth().verifyIdToken(token)
    
        if(decodedToken){
            // get the user data
            const data = await admin.auth().getUser(decodedToken.user_id)
    
            if(data){
                //create the user and insert it in the DB
                const user = await User.findById(data.uid)
    
                if(user){
                    res.status(200).json(user)
                } else {
                    res.status(500);
                }
            }
        }
    } catch(e){
        next(e)
    }
});

export { registerUser, updateProfile, currentUser }
