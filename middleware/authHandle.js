import admin from 'firebase-admin';

const VerifyToken = async(req,res,next) => {
    try{
        const token = req.headers.authorization.split(' ')[1];

        const value = await admin.auth().verifyIdToken(token);

        if(value){
            return next();
        } else {
            res.status(500);
        }
    } catch(err){
        console.log(err)
    }
}

export { VerifyToken }