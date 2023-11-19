import express from 'express';
import { createPaymentIntent, paymentFulfillment } from '../controllers/paymentController.js';

const router = express.Router();

router.get('/create-payment-intent', createPaymentIntent);

router.post('/webhook', paymentFulfillment);

export default router