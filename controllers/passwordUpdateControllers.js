import asyncHandler from 'express-async-handler';
import { checkRequestCache } from '../utils/manageVisitors.js';
import { redis_rate_limit } from '../server.js';
let custom_statusCode;
let custom_err_message;
let custom_err_title;

//@desc route to apply a limit of forgot password email sent to a specific email
//@route POST /password-update/request-limit
//@access PUBLIC 
const RequestSentLimitCheck = asyncHandler(async(req,res,next) => {
    try{
        // get the object in the request body
        const { limit_obj } = req.body
        // check the cache for the object
        const verify_cache = await checkRequestCache(redis_rate_limit, limit_obj.email);
        // if it exceeds 5 return a false 
        if(!verify_cache){
            // else just return false
            res.status(200).send({ request_allowed: false });
        } else if (verify_cache){
            // return true
            res.status(200).send({ request_allowed: true });
        } else {
            custom_err_message = 'Verifying cached failed';
        }
    } catch(err){
        next({ 
            statusCode: custom_statusCode || 500, 
            title: custom_err_title || 'SERVER ERROR', 
            message: custom_err_message, 
            stack: err.stack 
        });
    }
});

export { RequestSentLimitCheck }