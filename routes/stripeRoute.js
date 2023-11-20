import express from 'express';
import { createPaymentIntent, paymentFulfillment } from '../controllers/paymentController.js';
import bodyParser from 'body-parser';

const router = express.Router();

router.post('/create-payment-intent', createPaymentIntent);

router.post('/webhook', bodyParser.raw({ type: 'application/json' }), paymentFulfillment);

export default router