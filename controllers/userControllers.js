import asyncHandler from 'express-async-handler';
import User from '../models/userModels.js';
import Widget from '../models/widgetModels.js';
import admin from 'firebase-admin';
import Visitors from '../models/visitorsModels.js';
import ChatRoom from '../models/chatRoomModels.js';
import { uniqueUserHash } from '../utils/manageVisitors.js';
import { sendNotificationUpdate } from '../controllers/sseControllers.js';

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

//@desc Update the user profile Username or Email
//@route PUT /user/update-profile
//@access PRIVATE
const updateProfile = asyncHandler(async(req,res,next) => {
    try{
        const { new_name, new_email } = req.body
        // get the token of the user
        const token = req.headers.authorization.split(" ")[1]
        // validate and decode the token
        const decodedToken = await admin.auth().verifyIdToken(token)
        if(!decodedToken){
            res.status(403);
        }
        // find the user with his email
        const user = await User.findById(decodedToken.uid);
        // To gather every updates sent back
        const updateProfile = {};
        // make sure it is found
        if(!user){
            res.status(500).send({ message: 'Unable to find User to update the profile' })
        }

        if(new_name){ 
            // if a username is sent back
            if(user.username !== new_name){
                // set it in the updateprofile object
                updateProfile.username = new_name;
            }
        } 
        if(new_email){
            // if a new email is sent back
            if(user.email !== new_email){
                // set it int the updateprofile object
                updateProfile.email = new_email;
            }
        }

        if(Object.keys(updateProfile).length === 0){
            res.status(200).json({ message: "Nothing to update"});
        } else {
            // update what was updated
            const update = await User.findByIdAndUpdate(
                {_id: decodedToken.uid},
                {
                    $set: updateProfile
                },
                {new:true}
            );
            console.log(updateProfile)
            if(updateProfile.username && updateProfile.email){
                admin.auth().updateUser(decodedToken.uid,{
                    email: updateProfile.email,
                    displayName: updateProfile.username
                });
            } else if(updateProfile.username){
                admin.auth().updateUser(decodedToken.uid,{
                    displayName: updateProfile.username
                });
            } else if(updateProfile.email){
                admin.auth().updateUser(decodedToken.uid,{
                    email: updateProfile.email
                });
            }
            if(update){
                res.status(201).json({ message: "User Profile Updated" });
            } else {
                res.status(500);
                throw new Error("Unable to update the profile using the info provided");
            }
        }
    } catch(err){
        console.log(err)
        next(err)
    }
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

//@desc CLEAR the user notification array
//@route DELETE /user/clear-notification
//@access PRIVATE
const clearNotifications = asyncHandler(async(req,res,next) => {
    try{
        //get the user token
        const token = req.headers.authorization.split(' ')[1]
        //validate it
        const decodedToken = await admin.auth().verifyIdToken(token)
        if(!decodedToken){
            res.status(403);
        }
        const user = await User.findById(decodedToken.uid)
        if(!user){
            res.status(404).send({message: "Clearing notification: User not found in DB"});
        } else {
            // access his notification array and clear it
            user.notification = [];
            await user.save();
            sendNotificationUpdate(user._id, [])
            // return a positive response back from the server
            res.status(201).send({ message: 'Notifications cleared' });
        }
    } catch(err){
        console.log(err)
        next(err)
    }
});

//@desc Clean up the seen notifications by the user
//@route DELETE /user/clean-up-notification        
//@access PRIVATE
const cleanUpNotifications = asyncHandler(async(req,res,next) => {
    try{
        // get the sent notification array
        const { notif_array } = req.body
        // get the token of the user
        const token = req.headers.authorization.split(" ")[1]
        // validate and decode the token
        const decodedToken = await admin.auth().verifyIdToken(token)
        if(!decodedToken){
            res.status(403);
        }
        // find the user
        const user = await User.findById(decodedToken.uid)
        if(!user){
            res.status(404).send({ message: "User not found in the DB for notification clean up"})
        }
        // filter the user notification array with the seen notif array
        const updatedNotifications = user.notification.filter(notif => !notif_array.includes(notif._id.toString()));
        // save it
        if(Array.isArray(updatedNotifications)){
            user.notification = updatedNotifications
            await user.save();
            sendNotificationUpdate(user._id, updatedNotifications)
            // return a positive response back from the server
            res.status(201).send({ message: 'Notifications cleaned up' });
        } else {
            res.status(500).send({ message: "Error cleaning up the seen notifications"})
        }
    } catch(err){
        console.log(err)
        next(err)
    }
});

export { registerUser, updateProfile, currentUser, clearNotifications, cleanUpNotifications }
