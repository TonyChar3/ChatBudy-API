import admin from 'firebase-admin';
import User from '../models/userModels.js';

/**
 * Verify the token and return its content for use
 */
const VerifyFirebaseToken = async(req,res) => {
    try{
        const token = req.headers.authorization.split(" ")[1]
        const decoded_token = await admin.auth().verifyIdToken(token);
        if(!decoded_token){
            res.status(401);
            next();
        }
        return decoded_token
    } catch(err){
        console.log('ERROR VerifyFirebaseToken()');
        next(err)
    }
}
/**
 * Verify the User hash to give access to widget routes
 */
const VerifyUserHash = async(user_hash) => {
    try{
        const user = await User.findOne({ user_access: user_hash });
        if(!user){
            return false;
        }
        return true;
    } catch(err){
        console.log('ERROR VerifyUserHash()');
        next(err);
    }
}

export { VerifyFirebaseToken, VerifyUserHash }