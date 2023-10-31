import { VerifyOriginHeader } from "./authHandle";

/**
 * Function to set the cors middleware options
 */
const corsOptions = async(req,res,callback ) => {
    try{
        const verified_origin = await VerifyOriginHeader(req,res);
        if(verified_origin === null){
            return
        }
        callback(null, { origin: verified_origin, credentials: true });
    } catch(err){
        console.log(err)
    }
};

export { corsOptions }