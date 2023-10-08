import express from 'express';
import { registerUser, updateProfile, currentUser, clearNotifications, cleanUpNotifications, getVisitorListCSV, DeleteUserAccount } from '../controllers/userControllers.js';
import { VerifyToken } from '../middleware/authHandle.js';
const router = express.Router();

router.use(VerifyToken)

router.post('/register', registerUser);

router.put('/update-profile', updateProfile);

router.get('/current', currentUser);

router.delete('/remove-profile', DeleteUserAccount);

router.get('/download-visitor-csv', getVisitorListCSV);

router.delete('/clear-notification', clearNotifications);

router.delete('/clean-up-notification', cleanUpNotifications);

export default router

