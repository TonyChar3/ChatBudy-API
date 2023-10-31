import admin from 'firebase-admin';
import User from '../models/userModels.js';
import Widget from '../models/widgetModels.js';
import { decodeJWT } from '../utils/manageVisitors.js';
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
 * Verify for access to the widget styling
 */
const VerifyAccessWidgetStyle = async(req,res) => {
    // const token = req.headers.authorization.split(" ")[1]
    const token = req.cookies;
    const decode_token = await decodeJWT(token, 'Visitor');
    if(Object.keys(decode_token).length === 0){
        await VerifyFirebaseToken(req,res);
    }
    return decode_token
}
/**
 * Verify visitor widget token
 */
const VerifyWidgetToken = async(req,res) => {
    try{
        // const token = req.headers.authorization.split(" ")[1]
        const token = req.cookies;
        const decode_token = await decodeJWT(token, 'Visitor');
        if(Object.keys(decode_token).length === 0){
            throw new Error('Invalid auth token');
        }
        return decode_token
    } catch(err){
        res.status(401).json({
            title: 'UNAUTHORIZED',
            message: 'Invalid auth token',
            stackTrace: err.stack
        });
        return false;
    }
}
/**
 * Verify the User hash to give access to widget routes
 */
const VerifyUserHash = async(req,res) => {
    try{
        let user_hash;
        if (req.params && req.params.user_hash) {
            user_hash = req.params.user_hash;
        } else if (req.body && req.body.user_hash) {
            user_hash = req.body.user_hash;
        } else if (req.body && req.body.data && req.body.data.user_hash) {
            user_hash = req.body.data.user_hash;
        } else if (req.params && req.params.id) {
            user_hash = req.params.id; 
        }
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
/**
 * Verify the origin  header if the origin is allowed
 */
const VerifyOriginHeader = async(req,res) => {
    try{
        const origin = req.headers.origin;
        // check if the origin exist in the Widget collection
        const verify_origin = await Widget.findOne({ domain: origin });
        if(verify_origin === null){
            throw new Error('Invalid origin');
        }
        return origin;
    } catch(err){
        res.status(401).json({
            title: 'UNAUTHORIZED',
            message: 'Invalid origin',
            stackTrace: err.stack
        });
        return false;
    }
}

export { VerifyFirebaseToken, VerifyUserHash, VerifyWidgetToken, VerifyAccessWidgetStyle, VerifyOriginHeader }