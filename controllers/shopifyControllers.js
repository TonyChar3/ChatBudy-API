import asyncHandler from 'express-async-handler';
import dotenv from 'dotenv';
import { shopify } from '../server.js';
import { redis_nonce_storage } from '../server.js';
import { verifyShopifyDomain } from '../utils/manageShopify.js';
import { VerifyFirebaseToken } from '../middleware/authHandle.js';
import queryString from 'query-string';
import crypto from 'crypto';
import axios from 'axios';
dotenv.config()

let custom_statusCode;
let custom_err_message;
let custom_err_title;

//@desc a route to get the admin hash for to initialize the widget
//@route GET /shopify/widget_id
//@access PRIVATE
const shopifyAdminID = asyncHandler(async(req,res,next) => {
    try{
        console.log('shopify request: ', req)
        res.status(201).send({ admin_id: '123456'})
    } catch(err){
        next({ 
            statusCode: custom_statusCode || 500, 
            title: custom_err_title || 'SERVER ERROR', 
            message: custom_err_message, 
            stack: err.stack 
        });
    }
})
//@desc test route to get a feel of the shopify api
//@route POST /shopify/auth
//@access PRIVATE
const shopifyAuth = asyncHandler( async(req, res, next) => {
    // verify firebase auth token
    await VerifyFirebaseToken(req,res);
    try{
        const { shop_name } = req.body
        // verify the shopify domain name
        const verified_shop_name = verifyShopifyDomain(shop_name);
        if(!verified_shop_name){
            custom_statusCode = 401;
            custom_err_message = 'Invalid shopify domain url';
            custom_err_title = 'UNAUTHORIZED';
            throw new Error();
        } else {
            const apiKey = process.env.SHOPIFY_PUBLIC
            const redirectUri = process.env.HOST_NAME + '/shopify/callback'
            const shopState = shopify.auth.nonce()
            const authUrl = `https://${shop_name}/admin/oauth/authorize?client_id=${apiKey}&scope=write_products&redirect_uri=${redirectUri}&state=${shopState}`;
    
            redis_nonce_storage.set(`nonce:${shopState}`, shopState, 'EX', 10);
            res.send(authUrl);
        }
    } catch(err){
        next({ 
            statusCode: custom_statusCode || 500, 
            title: custom_err_title || 'SERVER ERROR', 
            message: custom_err_message, 
            stack: err.stack 
        });
    }
});
//@desc route to build the shopify app install and redirect the user to install
//@route /shopify/callback
//@access PRIVATE
const shopifyCallback = asyncHandler(async(req,res,next) => {
        const { shop, hmac, code, state } = req.query;
        const stateCookie = await redis_nonce_storage.get(`nonce:${state}`)
     
        if (state !== stateCookie) {
            custom_statusCode = 403;
            custom_err_message = 'Reuqest origin cannot be verified';
            custom_err_title = 'FORBIDDEN';
            next({ 
                statusCode: custom_statusCode || 500, 
                title: custom_err_title || 'SERVER ERROR', 
                message: custom_err_message, 
                stack: err.stack 
            });
        }
     
        if (shop && hmac && code) {
            const map = Object.assign({}, req.query);
            delete map['signature'];
            delete map['hmac'];
            const message = queryString.stringify(map);
            const providedHmac = Buffer.from(hmac, 'utf-8');
            const generatedHash = Buffer.from(crypto.createHmac('sha256', process.env.SHOPIFY_PRIVATE).update(message).digest('hex'),'utf-8');
            let hashEquals = false;
         
            try {
                hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
            } catch (e) {
                hashEquals = false;
            };
         
            if (!hashEquals) {
                custom_statusCode = 400;
                custom_err_message = 'HMAC validation failed';
                custom_err_title = 'VALIDATION ERROR';
                next({ 
                    statusCode: custom_statusCode || 500, 
                    title: custom_err_title || 'SERVER ERROR', 
                    message: custom_err_message, 
                    stack: err.stack 
                });
            }
            const accessTokenRequestUrl = `https://${shop}/admin/oauth/access_token?client_id=${process.env.SHOPIFY_PUBLIC}&client_secret=${process.env.SHOPIFY_PRIVATE}&code=${code}`;
            const accessTokenPayload = {
                client_id: process.env.SHOPIFY_PUBLIC,
                client_secret: process.env.SHOPIFY_PRIVATE,
                code,
            };
            axios.post(accessTokenRequestUrl, {
                json: accessTokenPayload
            },{
                headers: {
                    'Content-Type':'application/json'
                }
            })
            .then((accessTokenResponse) => {
              const accessToken = accessTokenResponse.data.access_token;
              const apiRequestURL = `https://${shop}/admin/shop.json`;
              const apiRequestHeaders = { "X-Shopify-Access-Token": accessToken }

                axios.get(apiRequestURL,{
                    headers: apiRequestHeaders
                })
                .then(() => {
                    res.redirect(`https://${shop}/admin/themes/current/editor?context=apps&template=product&activateAppId=${process.env.SHOPIFY_APP_ID}`);
                })
                .catch(() => {
                    custom_err_message = 'Unable to redirect to url';
                    custom_err_title = 'SERVER ERROR'
                    next({ 
                        statusCode: custom_statusCode || 500, 
                        title: custom_err_title || 'SERVER ERROR', 
                        message: custom_err_message, 
                        stack: err.stack 
                    });
                });
            }) 
            .catch(() => {
                custom_err_message = 'Invalid shopify accessToken';
                custom_err_title = 'SERVER ERROR'
                next({ 
                    statusCode: custom_statusCode || 500, 
                    title: custom_err_title || 'SERVER ERROR', 
                    message: custom_err_message, 
                    stack: err.stack 
                });
            });
  
        } else {
            next({ 
                statusCode: custom_statusCode || 500, 
                title: custom_err_title || 'SERVER ERROR', 
                message: custom_err_message, 
                stack: err.stack 
            });
        }
})

export { shopifyAuth, shopifyCallback, shopifyAdminID }