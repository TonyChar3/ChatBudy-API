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
import shopifyRoute from './routes/shopifyRoute.js';
import { corsOptions } from './middleware/getOrigins.js';
import cookieParser from 'cookie-parser';
import { webSocketServerSetUp } from './config/webSockets.js';
import '@shopify/shopify-api/adapters/node';
import {shopifyApi, LATEST_API_VERSION} from '@shopify/shopify-api';
import redis from 'redis';

const shopify = shopifyApi({
    // The next 4 values are typically read from environment variables for added security
    apiKey: process.env.SHOPIFY_PUBLIC,
    apiSecretKey: process.env.SHOPIFY_PRIVATE,
    scopes: ['read_products'],
    apiVersion: LATEST_API_VERSION,
    hostName: process.env.HOST_NAME,
});

const credentials = JSON.parse(fs.readFileSync('./firebaseKey/salezy-4de15-firebase-adminsdk-vql86-b2b376decd.json'))

admin.initializeApp({
    credential: admin.credential.cert(credentials)
});

dotenv.config();

connectDB();

const REDIS_PORT = process.env.REDIS_PORT
const redis_chatroom = redis.createClient({
    host: '127.0.0.1',
    port: REDIS_PORT,
    database: 0
});

const redis_rate_limit = redis.createClient({
    host: '127.0.0.1',
    port: REDIS_PORT,
    database: 1
});

const redis_nonce_storage = redis.createClient({
    host: '127.0.0.1',
    port: REDIS_PORT,
    database: 2
});

const app = express();
const port = process.env.PORT || 8000

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(cors(corsOptions));

app.use(helmet());

app.use(cookieParser());

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

// Shopify integration route
app.use('/shopify', shopifyRoute);

const server = app.listen(port, async() => {
    console.log(`Server running on port ${port}`);
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
});

export { redis_rate_limit, redis_chatroom, redis_nonce_storage, shopify }

