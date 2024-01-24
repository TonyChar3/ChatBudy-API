import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/dbConnection.js';
import helmet from 'helmet';
import cors from 'cors';
import admin from 'firebase-admin';
import fs from 'fs';
import userRoutes from './routes/userRoutes.js';
import widgetRoutes from './routes/widgetRoutes.js';
import visitorRoutes from './routes/visitorRoutes.js';
import sseRoute from './routes/sseRoute.js';
import chatRoute from './routes/chatRoute.js';
import passwordUpdateRoute from './routes/passwordUpdateRoute.js';
import stripeRoute from './routes/stripeRoute.js';
import { corsOptions } from './middleware/getOrigins.js';
import cookieParser from 'cookie-parser';
import { webSocketServerSetUp } from './config/webSockets.js';
import '@shopify/shopify-api/adapters/node';
import {shopifyApi, LATEST_API_VERSION} from '@shopify/shopify-api';
import redis from 'redis';
import Constant from "./constants.js";
import stripe from 'stripe';

// use .env variables
dotenv.config();

const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

/**
 * ChatBüdy project Nodejs + Express API
 * 
 * made by TonyChar3
 */

// initiate Shopify Api
const shopify = shopifyApi({
    // The next 4 values are typically read from environment variables for added security
    apiKey: process.env.SHOPIFY_PUBLIC,
    apiSecretKey: process.env.SHOPIFY_PRIVATE,
    scopes: ['read_products'],
    apiVersion: LATEST_API_VERSION,
    hostName: process.env.HOST_NAME,
});

// initate Firebase Admin SDK
const credentials = JSON.parse(fs.readFileSync('./salezy-4de15-firebase-adminsdk-vql86-b2b376decd.json'))
admin.initializeApp({
    credential: admin.credential.cert(credentials)
});

//config nodemailer
const config_nodemailer = {
    service: 'gmail',
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
    }
}

// connect our MongoDB cluster
connectDB();

// cache chatrooms
const redis_chatroom = redis.createClient({
    url: process.env.REDIS_URL_CONNECT,
    database: 0
});
// cache rate_limit count
const redis_rate_limit = redis.createClient({
    url: process.env.REDIS_URL_CONNECT,
    database: 1
});
// cache shopify nonce 
const redis_nonce_storage = redis.createClient({
    url: process.env.REDIS_URL_CONNECT,
    database: 2
});
// cache widget tokens for a secure access
const redis_widget_tokens = redis.createClient({
    url: process.env.REDIS_URL_CONNECT,
    database: 7
});

// Set up Express
const app = express();
const port = process.env.PORT || 8000
app.use(express.json({
    limit: '5mb',
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    }
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// enable CORS
app.use(cors(corsOptions));
// Security purposes
app.use(helmet());

// User routes
app.use('/user', userRoutes);

// Widget routes
app.use('/code', widgetRoutes);

// Visitors routes
app.use('/visitor', visitorRoutes);

// Chat routes
app.use('/chat', chatRoute);

// SSE connection route
app.use('/connection', sseRoute);

// Password update route
app.use('/password-update', passwordUpdateRoute);

// Stripe route
app.use('/stripe', stripeRoute);

// handle the error
app.use((err, req, res, next) => {
    if(res.headersSent){
        return
    }
    const statusCode = err.statusCode ? err.statusCode : 500;

    switch (statusCode) {
        case Constant.VALIDATION_ERROR :
            res.status(statusCode || 500).json({
                title: err.title,
                message: err.message,
                stackTrace: err.stack
            });
            break;

        case Constant.NOT_FOUND :
            res.status(statusCode || 500).json({
                title: err.title,
                message: err.message,
                stackTrace: err.stack
            });
            break;

        case Constant.UNAUTHORIZED :
            res.status(statusCode || 500).json({
                title: err.title,
                message: err.message,
                stackTrace: err.stack
            });
            break;

        case Constant.FORBIDDEN :
            res.status(statusCode || 500).json({
                title: err.title,
                message: err.message,
                stackTrace: err.stack
            });
            break;

        case Constant.SERVER_ERROR :
            res.status(statusCode || 500).json({
                title: err.title,
                message: err.message,
                stackTrace: err.stack
            });
            break;
        default:
            break;
    }
});

// Connect and start the server
const server = app.listen(port, async() => {
    console.log(`Server running on port ${port}`);
    /**
     * Connect the different Redis client to export them
     */
    redis_chatroom.connect().then(() => {
        console.log('Redis chatroom client is connected')
        webSocketServerSetUp(redis_chatroom, server);
    })
    .catch((err) => {
        console.log('Redis chatroom client ERROR: ', err)
    });
    redis_rate_limit.connect().then(() => {
        console.log('Redis rate limit client is connected');
    })
    .catch((err) => {
        console.log('Redis rate limit client ERROR: ', err)
    });
    redis_nonce_storage.connect().then(() => {
        console.log('Redis nonce storage is connected');
    })
    .catch((err) => {
        console.log('Redis nonce storage client ERROR: ', err)
    });
    redis_widget_tokens.connect().then(() => {
        console.log('Redis widget token storage is connected')
    })
    .catch((err) => {
        console.log('Redis widget token storage client ERROR: ', err)
    });
});

export { redis_rate_limit, redis_chatroom, redis_nonce_storage, redis_widget_tokens, shopify, config_nodemailer, stripeInstance }

