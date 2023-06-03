import asyncHandler from 'express-async-handler';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { uniqueVisitorID, getVisitorBrowser } from '../utils/manageVisitors.js';
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
                res.status(200).json({ info: data })
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
        
        const uid = await uniqueVisitorID(access_id);
        const visitor = await Visitor.findById(access_id);
        const visitor_browser = await getVisitorBrowser(browser);
       
        if(uid && visitor && visitor_browser) {
            
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
                res.json({ message: "New visitor!"})
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
                sendUpdateToUser(user._id, [{ message: "No visitors" }]);
                res.send({ message: "No visitors"});
            } else {
                sendUpdateToUser(user.uid, visitor_array.visitor);
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
                sendUpdateToUser(userUID, user_visitors.visitor)
                res.status(200).json({ message: "Visitor removed" });
            }
            
        } else {
            res.status(404);
        }
    } catch(err){   
        next(err);
    }
});


export { visitorInfoFetch, createVisitor, fetchAllVisiotr, deleteVisitor }