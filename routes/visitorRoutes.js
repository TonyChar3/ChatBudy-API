import express from 'express';
import { visitorInfoFetch, createVisitor, fetchAllVisiotr, deleteVisitor } from '../controllers/visitorControllers.js';

const router = express.Router();

router.post('/all-visitor', fetchAllVisiotr);

router.get('/visitor-info', visitorInfoFetch);

router.post('/new-visitor-:id', createVisitor);

router.delete('/delete-visitor', deleteVisitor);

export default router;