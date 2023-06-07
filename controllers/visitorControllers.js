import asyncHandler from 'express-async-handler';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { getVisitorBrowser, realTimeUpdated, generateJWT, generateRandomID } from '../utils/manageVisitors.js';
import Visitor from '../models/visitorsModels.js';
import User from '../models/userModels.js';
import admin from 'firebase-admin';
import { sendUpdateToUser } from '../controllers/sseControllers.js';

dotenv.config();

//@desc To get the visitor info
//@route GET /visitor/visitor-info
//@access PRIVATE
const visitorInfoFetch = asyncHandler( async(req,res,next) => {
    try {
        const api_key = process.env.GEO_KEY

        const response = await fetch(`https://api.geoapify.com/v1/ipinfo?&apiKey=${api_key}`)
        if(response) {
            const data =  await response.json()
            if(data) {
                res.json({ info: data })
            }
        }
        
    } catch(err) {
        console.log(err)
    }
});

//@desc Route to create a new visitor
//@route POST /visitor/new-visitor
//@access PRIVATE
const createVisitor = asyncHandler(async(req,res,next) => {
    try{
        const { isoCode, browser } = req.body;
        const access_id = req.params.id
        
        const uid = generateRandomID(access_id);
        const visitor = await Visitor.findById(access_id);
        const visitor_browser = await getVisitorBrowser(browser);
       
        if( visitor && visitor_browser && uid) {
            
            const newVisitor = {
                _id: uid,
                country: isoCode,
                browser: visitor_browser.name
            }

            const add_visitor = await visitor.updateOne({
                $push: {
                    visitor: newVisitor
                }
            });

            if(add_visitor){
                const get_update = await realTimeUpdated(access_id);
                if(!get_update){
                    res.status(500);
                }
                sendUpdateToUser(get_update.userID, get_update.array)

                const generate_token = await generateJWT(uid)
                if(!generate_token){
                    res.status(500);
                    throw new Error('Unable to generate JWT for visitor...please try again')
                }
                // res.cookie('visitor_jwt', generate_token, { maxAge: 48 * 60 * 60 * 1000, httpOnly:false, sameSite: false })
                res.send({ visitorToken: generate_token });
            }
        }
    } catch(err) {
        console.log(err)
    }
});

//@desc Route to get all of the visitors in the array
//@route GET /visitor/all-visitor
//@access PRIVATE
const fetchAllVisiotr = asyncHandler(async(req,res,next) => {
    try{
        const token = req.headers.authorization.split(' ')[1]

        const decodedToken = await admin.auth().verifyIdToken(token)

        if(decodedToken){
            const user = await User.findById(decodedToken.uid)
            if(!user){
                res.status(500);
                throw new Error("Unable to find your visitor array...please reload and try again")
            }
    
            const visitor_array = await Visitor.findById(user.user_access);
            if(!visitor_array){
                res.status(500);
                throw new Error("Unable to find your visitor array...please reload and try again")
            }
    
            if(visitor_array.visitor.length === 0) {
                sendUpdateToUser(user._id, { message: "No visitors" });
                res.send({ message: "No visitors"});
            } else {
                sendUpdateToUser(user._id, visitor_array.visitor);
                res.status(201);
            }
        }
    } catch(err){
        next(err);
    }
});

//@desc Route to delete a specific visitor
//@route DELETE /visitor/delete-visitor
//@access PRIVATE
const deleteVisitor = asyncHandler( async(req,res,next) => {
    try{
        // will need the user hash + the visitor _id
        const { u_hash, visitor_id } = req.body;

        const userUID = await User.findOne({ user_access: u_hash })
        // find the visitor object in the collection
        const user_visitors = await Visitor.findById(u_hash);
        if(!user_visitors || !userUID){
            res.status(500);
        }
        // loop through the visitor array and check for the matching _id
        const visitor_index = user_visitors.visitor.findIndex(visitr => visitr._id.toString() === visitor_id.toString())
        if(visitor_index !== -1){
            user_visitors.visitor.splice(visitor_index, 1);
            const save = await user_visitors.save();
            if(save){
                sendUpdateToUser(userUID._id, user_visitors.visitor)
                res.status(200).json({ message: "Visitor removed" });
            }
            
        } else {
            res.status(404);
        }
    } catch(err){   
        next(err);
    }
});

//@desc Route to update the specific visitor
//@route PUT /visitor/update-visitor
//@acces PRIVATE
const updateVisitor = asyncHandler(async(req,res,next) => {
    try{
        // get the specific user ID
        // find him
        // update his profile
        // save()
        // send back success message
    } catch(err){
        res.status(500);
        next(err)
    }
});


export { visitorInfoFetch, createVisitor, fetchAllVisiotr, deleteVisitor, updateVisitor }