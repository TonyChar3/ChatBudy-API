import asyncHandler from 'express-async-handler';
import User from '../models/userModels.js';
import admin from 'firebase-admin';

//@desc Register a new User
//@route POST /user/register
//@access PRIVATE
const registerUser = asyncHandler(async(req,res,next) => {
    try{
        const token = req.headers.authorization.split(' ')[1]

        const decodedToken = await admin.auth().verifyIdToken(token)

        if(decodedToken){
            // get the user data
            const data = await admin.auth().getUser(decodedToken.user_id)

            if(data){
                //create the user and insert it in the DB
                const user = await User.create({
                    _id: data.uid,
                    username: data.displayName,
                    email: data.email,
                })

                if(user){
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
