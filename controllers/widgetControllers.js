import asyncHandler from 'express-async-handler';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

//@desc To get the widget
//@route GET /widget/chat-widget
//@access PRIVATE
const initializeWidget = asyncHandler( async(req,res,next) => {

    try{
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const widgetPath = path.join('template', 'main.js');

        res.set('Content-Type', 'text/javascript');
        res.set('Access-Control-Allow-Origin', 'http://10.0.0.129:3000'); // Set the allowed origin
        res.set('Access-Control-Allow-Credentials', 'true');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    
        fs.createReadStream(widgetPath).pipe(res);
    } catch(err) {
        console.log(err)
    }
});

export { initializeWidget }