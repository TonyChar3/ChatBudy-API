import express from 'express';
import { createPaymentIntent, paymentFulfillment } from '../controllers/paymentController';

const router = express.Router();

router.post('/create-payment-intent', createPaymentIntent);

router.post('/webhook', paymentFulfillment);

export default router