import Widget from '../models/widgetModels.js';
/**
 * Check for allowed origin domain
 */
const AllowedDomainVerification = async() => {
    try{ 
        const domains = await Widget.distinct('domain');
        domains.push('http://localhost:5173');// allow access to the admin panel as well
        domains.push('https://iran-mediterranean-reservation-handled.trycloudflare.com')
        domains.push('https://tony-web-store.myshopify.com')
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
        console.log('origin bro: ', origin);
        if(allowedOrigins && origin){
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