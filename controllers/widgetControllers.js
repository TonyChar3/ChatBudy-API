import asyncHandler from 'express-async-handler';
import fs from 'fs';
import path from 'path';
import Widget from '../models/widgetModels.js';
import User from '../models/userModels.js';
import admin from 'firebase-admin';

//@desc To get the widget
//@route GET /widget/chat-widget
//@access PRIVATE
const initializeWidget = asyncHandler( async(req,res,next) => {

    try{
        const { id } = req.params;
        const domainWidget = await Widget.findById(id);
        const widgetAdmin = await User.findOne({ user_access: id })

        if(!domainWidget || !widgetAdmin){
            res.status(404);
            throw new Error("Widget domain not found");
        } else {
            const widgetPath = path.join('template', 'main.js');
            res.set('Content-Type', 'text/javascript');
            res.set('Access-Control-Allow-Origin', `${domainWidget.domain}`);
            res.set('Access-Control-Allow-Credentials', 'true');
            res.set('Cross-Origin-Resource-Policy', 'cross-origin');
            
            const readStream = fs.createReadStream(widgetPath);
            let widgetContent = '';

            readStream.on('data', async(chunk) => {
                widgetContent += chunk.toString().replace('__HASH__', id)
            });

            readStream.on('end', () => {
                res.send(widgetContent);
            });
        }

    } catch(err) {
        console.log(err)
        next(err)
    }
});

//@desc To give the script tag link to correct user
const widgetCustomLink = asyncHandler(async(req,res,next) => {
    try{
        const token = req.headers.authorization.split(" ")[1]

        const decodedToken = await admin.auth().verifyIdToken(token)

        if(decodedToken){

            const user = await User.findById(decodedToken.user_id);
            if(!user){
                res.status(500);
            }
            res.status(200).json({ link: `<script type="module" src="http://localhost:8080/widget/${user.user_access}" async></script>`})
        }
    } catch(err){
        console.log(err)
        next(err)
    }
});

export { initializeWidget, widgetCustomLink }