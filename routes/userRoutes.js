import express from 'express';
import { registerUser, updateProfile, currentUser, clearNotifications, cleanUpNotifications } from '../controllers/userControllers.js';
import { VerifyToken } from '../middleware/authHandle.js';
const router = express.Router();

router.use(VerifyToken)

router.post('/register', registerUser);

router.put('/update-profile', updateProfile);

router.get('/current', currentUser);

router.delete('/clear-notification', clearNotifications);

router.delete('/clean-up-notification', cleanUpNotifications);

export default router

