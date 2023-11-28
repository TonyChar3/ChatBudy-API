import Widget from '../models/widgetModels.js';
/**
 * Check for allowed origin domain
 */
const AllowedDomainVerification = async() => {
    try{ 
        const domains = await Widget.distinct('domain');
        domains.push('https://www.chatbudy.io');
        domains.push('http://localhost:3000');
        domains.push('http://10.0.0.78:3000');
        domains.push('https://chatbudy-api.onrender.com')
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
        const host = req.header('host');
        const stripe_headers = req.rawHeaders.includes('Stripe-Signature')
        if(allowedOrigins && origin){
            const matchingOrigin = allowedOrigins.find((allowedOrigin) => {
                return origin.toString() === allowedOrigin.toString();
            });
            if(matchingOrigin) {
                callback(null, { origin: matchingOrigin, credentials: true });
            } else if(host === 'chatbudy-api.onrender.com' || host === 'localhost:8080'){
                callback(null, { origin: '*', credentials: true });
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        } else if (stripe_headers && host === 'chatbudy-api.onrender.com' || host === 'localhost:8080') {
            callback(null, { origin: `${host === 'localhost:8080'? 'localhost:8080' : 'chatbudy-api.onrender.com'}`, credentials: true });
        }
    } catch(err){
        console.log(err)
    }
};

export { corsOptions }