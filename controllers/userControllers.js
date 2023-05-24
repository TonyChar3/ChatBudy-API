import asyncHandler from 'express-async-handler';
import bcrypt from 'bcrypt';
import User from '../models/userModels.js';

//@desc Register a new User
//@route POST /user/register
//@access public
const registerUser = asyncHandler(async(req,res,next) => {
    try{
        
    } catch(err){
        res.status(500)
    }
    res.json({ message: 'User registered'})
});

export { registerUser }
