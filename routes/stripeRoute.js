import express from 'express';
import { createPaymentIntent, paymentFulfillment, startPortalSession } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/create-payment-intent', createPaymentIntent);

router.post('/customer-portal', startPortalSession);

router.post('/webhook', express.raw({ type: 'application/json'}), paymentFulfillment);

export default router