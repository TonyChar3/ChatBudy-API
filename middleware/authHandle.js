import admin from 'firebase-admin';
import User from '../models/userModels.js';

/**
 * Verify the token and return its content for use
 */
const VerifyFirebaseToken = async(req,res) => {
    try{
        const token = req.headers.authorization.split(" ")[1]
        const decoded_token = await admin.auth().verifyIdToken(token);
        return decoded_token
    } catch(err){
        return res.status(401).json({
            title: 'UNAUTHORIZED',
            message: 'Invalid auth token',
            stackTrace: err.stack
        });
    }
}
/**
 * Verify the User hash to give access to widget routes
 */
const VerifyUserHash = async(req,res) => {
    try{
        const { user_hash } = req.params || req.body || req.body.data || req.params.id 
        const verify = await User.findOne({ user_access: user_hash });
        if(!verify){
            throw new Error('Invalid user hash')
        }
        return true
    } catch(err){
        res.status(401).json({
            title: 'UNAUTHORIZED',
            message: 'Invalid user hash',
            stackTrace: err.stack
        });
        return false;
    }
}

export { VerifyFirebaseToken, VerifyUserHash }