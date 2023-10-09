import asyncHandler from 'express-async-handler';
import User from '../models/userModels.js';
import Widget from '../models/widgetModels.js';
import admin from 'firebase-admin';
import Visitors from '../models/visitorsModels.js';
import ChatRoom from '../models/chatRoomModels.js';
import { uniqueUserHash } from '../utils/manageVisitors.js';
import { sendAdminSSEInfo } from '../utils/manageSSE.js';
import { Parser } from 'json2csv';
import { VerifyFirebaseToken } from '../middleware/authHandle.js';

//@desc Register a new User
//@route POST /user/register
//@access PRIVATE
const registerUser = asyncHandler(async(req,res,next) => {
    try{
        const { web_url, username } = req.body
        // TODO: Remove comment for production
        const url_regex = /^https:\/\/(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}[^ ]*$/
        const username_regex = /^[a-zA-Z0-9]+([\s._][a-zA-Z0-9]+)?$/
        const decode_token = await VerifyFirebaseToken(req, res);
        // get the user data
        const firebase_user_data = await admin.auth().getUser(decode_token.user_id);
        if(!firebase_user_data){
            res.status(404);
            next();
        }
        // generate a unique user hash
        const u_hash = await uniqueUserHash();
        if(!u_hash){
            res.status(500);
            next();
        }
        // TODO: Remove comment for production
        // sanitize the url and the username with regex
        if(!url_regex.test(web_url)){
            res.status(500);
            next();
        }
        if(!username_regex.test(username)){
            res.status(500);
            next();
        }

        // write to DB the new collection objects
        const [user, widget, visitor, chatroom] = await Promise.all([
            // create new User
            await User.create({
                _id: firebase_user_data.uid,
                user_access: u_hash,
                username: username,
                email: firebase_user_data.email
            }),
            // create new widget
            await Widget.create({
                _id: u_hash,
                domain: web_url,
                customization: {
                    position: "right",
                    shape: "square",
                    main_color: "#0c64f2",
                    greeting_message: "Hi! Want to know about our special offer 👀?",
                    admin_name: "Support agent 🤖",
                    font_color: "light"
                }
            }),
            // create Visitor collection object
            await Visitors.create({
                _id: u_hash
            }),
            // create Chatroom collection object
            await ChatRoom.create({
                _id: u_hash
            })
        ]);
        if(!user || !widget || !visitor || !chatroom){
            res.status(500);
            next();
        }
        res.status(200).json({ message: "Welcome to the Salezy App"});
    } catch(err){
        console.log('ERROR registerUser()');
        next(err);
    }
});
//@desc Update the user profile Username or Email
//@route PUT /user/update-profile
//@access PRIVATE
const updateProfile = asyncHandler(async(req,res,next) => {
    // To gather every updates sent back
    const update_profile = {};

    try{
        const { new_name, new_email } = req.body
        // validate and decode the token
        const decode_token = await VerifyFirebaseToken(req, res);
        // find the user with his email
        const user = await User.findById(decode_token.uid);
        // make sure it is found
        if(!user){
            res.status(404);
            next();
        }
        if(new_name){ 
            // if a username is sent back
            if(user.username !== new_name){
                // set it in the updateprofile object
                update_profile.username = new_name;
            }
        } 
        if(new_email){
            // if a new email is sent back
            if(user.email !== new_email){
                // set the emailVerified back to false
                admin.auth().updateUser(decode_token.uid,{
                    emailVerified: false
                })
                .catch((err) => {
                    next(err)
                })
                // set it int the updateprofile object
                update_profile.email = new_email;
            }
        }
        if(Object.keys(update_profile).length === 0){
            res.status(200).json({ message: "Nothing to update"});
        } else {
            // update what was updated
            const update = await User.findByIdAndUpdate(
                {_id: decode_token.uid},
                {
                    $set: update_profile
                },
                { new:true }
            );
            if(update_profile.username && update_profile.email){
                admin.auth().updateUser(decode_token.uid,{
                    email: update_profile.email,
                    displayName: update_profile.username
                });
            } else if(update_profile.username){
                admin.auth().updateUser(decode_token.uid,{
                    displayName: update_profile.username
                });
            } else if(update_profile.email){
                admin.auth().updateUser(decode_token.uid,{
                    email: update_profile.email
                });
            }
            if(!update){
                res.status(500);
                next();
            }
            res.status(201).json({ message: "User Profile Updated" });
        }
    } catch(err){
        console.log('ERROR updateProfile()');
        next(err);
    }
});
//@desc Get the current logged in user data
//@route GET /user/current
//@access PRIVATE
const currentUser = asyncHandler(async(req,res,next) => {
    try{
        // verify + decode the token
        const decode_token = await VerifyFirebaseToken(req, res);
        // get the user data
        const firebase_user_data = await admin.auth().getUser(decode_token.user_id);
        if(!firebase_user_data){
            res.status(404);
            next();
        }
        //create the user and insert it in the DB
        const user = await User.findById(firebase_user_data.uid);
        if(!user){
            res.status(404);
            next();
        } 
        res.status(200).json(user);
    } catch(e){
        console.log('ERROR currentUser()');
        next(e);
    }
});
//@desc delete the user account from the DB + Firebase
//@route DELETE /user/remove-profile
//@access PRIVATE
const deleteUserAccount = asyncHandler(async(req,res,next) => {
    try{
        // verify + decode token
        const decode_token = await VerifyFirebaseToken(req, res);
        // fetch and remove the User from the DB
        const user = await User.findById(decode_token.uid);
        if(!user){
            res.status(404);
            next();
        }
        // remove the user from the db
        await Promise.all([
            await Visitors.deleteOne({ _id: user.user_access }),
            await ChatRoom.deleteOne({ _id: user.user_access }),
            await Widget.deleteOne({ _id: user.user_access })
        ]);
        // remove it from firebase
        await Promise.all([
            await User.deleteOne({ _id: decode_token.uid }),
            await admin.auth().deleteUser(decode_token.uid)
        ]);
        // send back success
        res.status(201).send({ user_deleted: true });
    } catch(err){
        console.log('ERROR DeleteUserAccount()');
        next(err);
    }
})
//@desc CLEAR the user notification array
//@route DELETE /user/clear-notification
//@access PRIVATE
const clearNotifications = asyncHandler(async(req,res,next) => {
    try{
        // verify + decode token
        const decode_token = await VerifyFirebaseToken(req, res);
        const user = await User.findById(decode_token.uid);
        if(!user){
            res.status(404);
            next();
        }
        // access his notification array and clear it
        user.notification = [];
        await user.save();
        sendAdminSSEInfo('notification', user._id, []);
        // return a positive response back from the server
        res.status(201).send({ message: 'Notifications cleared' });
    } catch(err){
        console.log('ERROR clearNotifications()');
        next(err);
    }
});
//@desc Clean up the seen notifications by the user
//@route DELETE /user/clean-up-notification        
//@access PRIVATE
const cleanUpNotifications = asyncHandler(async(req,res,next) => {
    try{
        // get the sent notification array
        const { notif_array } = req.body
        // verify + deocde the token
        const decode_token = await VerifyFirebaseToken(req, res);
        // find the user
        const user = await User.findById(decode_token.uid)
        if(!user){
            res.status(404);
            next();
        }
        // filter the user notification array with the seen notif array
        const updatedNotifications = user.notification.filter(notif => !notif_array.includes(notif._id.toString()));
        // save it
        if(Array.isArray(updatedNotifications)){
            user.notification = updatedNotifications
            await user.save();
            sendAdminSSEInfo('notification', user._id, updatedNotifications)
            // return a positive response back from the server
            res.status(201).send({ message: 'Notifications cleaned up' });
        } else {
            res.status(500);
            next();
        }
    } catch(err){
        console.log('ERROR cleanUpNotifications()');
        next(err);
    }
});
//@desc Get a CSV file of the user visitor list
//@route GET /user/download-visitor-csv
//@acces PRIVATE
const getVisitorListCSV = asyncHandler(async(req,res,next) => {
    try{
        // verify + decode token
        const decode_token = await VerifyFirebaseToken(req, res);
        // use the UID to find the user
        const current_user = await User.findById(decode_token.uid);
        if(!current_user){
            res.status(404);
            next();
        }
        // use the User access hash to get the visitor list from the visitor collection
        const visitors = await Visitors.findById(current_user.user_access);
        if(!visitors){
            res.status(404);
            next();
        }
        // defines the CSV fields
        const fields = ['email', 'country'];
        // Convert 
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(visitors.visitor)
        // return it as download
        if(!csv){
            res.status(500);
            next();
        } 
        res.header('Content-Type', 'text/csv');
        res.attachment('visitors.csv');
        res.send(csv);  
    } catch(err){
        console.log('ERROR getVisitorListCSV()');
        next(err);
    }
});

export { registerUser, updateProfile, currentUser, clearNotifications, cleanUpNotifications, getVisitorListCSV, deleteUserAccount }
