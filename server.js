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

const credentials = JSON.parse(fs.readFileSync('./firebaseKey/salezy-4de15-firebase-adminsdk-vql86-b2b376decd.json'))

admin.initializeApp({
    credential: admin.credential.cert(credentials)
});

dotenv.config();

connectDB();

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.use(helmet());

// User routes
app.use('/user', userRoutes);

app.use('/widget/:id', express.static('template'));

// Widget routes
app.use('/widget', widgetRoutes);

//Visitors routes
app.use('/visitor', visitorRoutes);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});