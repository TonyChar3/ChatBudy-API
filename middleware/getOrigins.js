import Widget from '../models/widgetModels.js';
/**
 * Check for allowed origin domain
 */
const AllowedDomainVerification = async() => {
    try{ 
        const  domains = await Widget.distinct('domain');
        return domains
    } catch(err){
        console.log(err)
        return [];
    }
}
/**
 * Function to set the cors middleware options
 */
const corsOptions = async(req,callback ) => {
    try{
        const allowedOrigins = await AllowedDomainVerification();
        const origin = req.header('Origin');
        if(allowedOrigins){
            const matchingOrigin = allowedOrigins.find((allowedOrigin) => {
                return origin.toString() === allowedOrigin.toString();
            });
            if(matchingOrigin) {
                callback(null, { origin: matchingOrigin, credentials: true });
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    } catch(err){
        console.log(err)
    }
};

export { corsOptions }