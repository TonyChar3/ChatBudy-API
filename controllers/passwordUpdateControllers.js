import asyncHandler from 'express-async-handler';
import { checkRequestCache } from '../utils/manageVisitors.js';
import { redis_rate_limit } from '../server.js';

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
            res.status(500);
            next();
        }
    } catch(err){
        console.log('ERROR RequestSentLimitCheck');
        next(err);
    }
});

export { RequestSentLimitCheck }