
/**
 * Function to set the cors middleware options
 */
const corsOptions = async(req, callback ) => {
    try{
        callback(null, { origin: '*', credentials: true });
    } catch(err){
        console.log(err)
    }
};

export { corsOptions }