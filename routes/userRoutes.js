import express from 'express';
import { registerUser } from '../controllers/userControllers.js';
import { VerifyToken } from '../middleware/authHandle.js';
const router = express.Router();

router.post('/register', VerifyToken, registerUser);

router.post('/login', async(req,res,next) => {
    res.json({ message: "User Login" })
});

router.put('/update-profile', async(req,res,next) => {
    res.json({ message: "Update user profile..."})
});

router.get('/current', async(req,res,next) => {
    res.json({ message: "The current user"})
});

export default router

