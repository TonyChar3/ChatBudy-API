import express from 'express';
import { registerUser, updateProfile, currentUser } from '../controllers/userControllers.js';
import { VerifyToken } from '../middleware/authHandle.js';
const router = express.Router();

router.use(VerifyToken)

router.post('/register', registerUser);

router.put('/update-profile', updateProfile);

router.get('/current', currentUser);

export default router

