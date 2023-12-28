import express from 'express';
import { registerUser, updateProfile, currentUser, clearNotifications, cleanUpNotifications, getVisitorListCSV, deleteUserAccount } from '../controllers/userControllers.js';
const router = express.Router();

router.post('/register', registerUser);

router.put('/update-profile', updateProfile);

router.get('/current', currentUser);

router.delete('/remove-profile', deleteUserAccount);

router.get('/download-visitor-csv', getVisitorListCSV);

router.delete('/clear-notification', clearNotifications);

router.delete('/clean-up-notification', cleanUpNotifications);

export default router

