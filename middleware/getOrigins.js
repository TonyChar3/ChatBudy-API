import Widget from '../models/widgetModels.js';
/**
 * Check for allowed origin domain
 */
const AllowedDomainVerification = async(req) => {
    try{
        const origin = req.headers.origin;
        // check if the origin exist in the Widget collection
        const verify_origin = await Widget.findOne({ domain: origin });
        if(verify_origin === null){
            throw new Error('Invalid origin');
        }
        return origin;
    } catch(err){
        return false;
    }
}
/**
 * Function to set the cors middleware options
 */
const corsOptions = async(req,callback ) => {
    try{
        const verified_origin = await AllowedDomainVerification(req);
        if(verified_origin === null || !verified_origin){
            return
        }
        callback(null, { origin: verified_origin, credentials: true });
    } catch(err){
        console.log(err)
    }
};

export { corsOptions }