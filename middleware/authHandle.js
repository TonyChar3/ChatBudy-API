import admin from 'firebase-admin';
import User from '../models/userModels.js';

/**
 * To verify the Firebase token sent to the backend
 */
const VerifyToken = async(req,res,next) => {
    try{
        const token = req.headers.authorization.split(' ')[1];
        const value = await admin.auth().verifyIdToken(token);
        if(value){
            return next();
        } else {
            res.status(500);
            throw new Error("Token Invalid")
        }
    } catch(err){
        console.log(err)
        next(err)
    }
}
/**
 * To verify the user hash
 */
const VerifyHash = async(req,res,next) => {
    try{
        const { userhash } = req.params || req.body;
        // fetch for the user_access with the user_hash
    } catch(err){
        next(err)
    }
}

export { VerifyToken }