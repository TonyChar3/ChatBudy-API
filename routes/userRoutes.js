import express from 'express';
import { registerUser, updateProfile, currentUser, clearNotifications, cleanUpNotifications, getVisitorListCSV, getClosedClientsListCSV } from '../controllers/userControllers.js';
import { VerifyToken } from '../middleware/authHandle.js';
const router = express.Router();

router.use(VerifyToken)

router.post('/register', registerUser);

router.put('/update-profile', updateProfile);

router.get('/current', currentUser);

router.get('/download-visitor-csv', getVisitorListCSV);

router.get('/closed-clients-csv', getClosedClientsListCSV);

router.delete('/clear-notification', clearNotifications);

router.delete('/clean-up-notification', cleanUpNotifications);

export default router

