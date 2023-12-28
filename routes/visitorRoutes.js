import express from 'express';
import { visitorInfoFetch, createVisitor, deleteVisitor, sendEmail } from '../controllers/visitorControllers.js';
import { VerifyUserHash } from '../middleware/authHandle.js';

const router = express.Router();

router.get('/visitor-info', visitorInfoFetch);

router.post('/new-visitor-:user_hash', createVisitor);

router.post('/send-email-:user_hash', sendEmail);

router.delete('/delete-visitor', deleteVisitor);

export default router;