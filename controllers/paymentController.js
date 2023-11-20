import asyncHandler from 'express-async-handler';
import { stripeInstance } from '../server.js';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { registerPlusSubs, loginUserPlanUpdate } from '../utils/managePlusSubscriber.js';

dotenv.config()

//@desc to create the payment intent to the stripe API
const createPaymentIntent = asyncHandler( async(req,res,next) => {
    try{
        const { user_type, user_id, user_data } = req.body
        const decode_token = await admin.auth().verifyIdToken(user_id)
        const new_token = await admin.auth().createCustomToken(decode_token.uid)
        let stripe_user_id = decode_token.uid
        const StripeCustomer = await stripeInstance.customers.create({
            metadata:{
                userId: stripe_user_id,
                user_type: user_type,
                user_db_data: JSON.stringify(user_data)
            }
        });
        // create the checkout session with the Stripe API
        const session = await stripeInstance.checkout.sessions.create({
            customer: StripeCustomer.id,
            line_items: [
                {
                    price: process.env.STRIPE_PRODUCT_ID,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${user_type === 'new_client'? `http://localhost:5173/register?success=true` : 'http://localhost:5173/navbar/visitors'}`,
            cancel_url: `${user_type === 'new_client'? 'http://localhost:5173/register?canceled=true' : 'http://localhost:5173/login?canceled=true'}`,
            automatic_tax: { enabled: true },
            customer_update: {
                address: 'auto',
            }
        });
        // Send back the checkout UI url  
        //res.status(200).cookie('new_client_id', new_token, { maxAge: 48 * 60 * 60 * 1000, httpOnly: true, sameSite: 'none', secure: true })
        res.send({ url: session.url });
    } catch(err){
        next(err)
    }
});
 
//@desc webhook for when the checkout is done
//@route POST /stripe/webhook
//@acess PUBLIC
const paymentFulfillment = asyncHandler( async(req,res,next) => {
    const endpointSecret = process.env.STRIPE_ENDPOINT
    const sig = req.headers['stripe-signature'];

    let data;
    let eventType;
    let event;

    try {
        event = stripeInstance.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    data = event.data.object;
    eventType = event.type;
  
    // Handle the event
    if(eventType === 'checkout.session.completed'){
        stripeInstance.customers.retrieve(data.customer).then(
            (customer) => {
                const user_type = customer.metadata.user_type
                const user_id = customer.metadata.userId
                const user_data = JSON.parse(customer.metadata.user_db_data)

                if(user_type === 'new_client'){
                    const register = registerPlusSubs(
                        user_id, 
                        user_data.website_url, 
                        user_data.user_name, 
                        user_data.plan
                        );
                    if(register.error){
                        next({ 
                            statusCode: 500, 
                            title: 'SERVER ERROR', 
                            message: register.error_msg || 'NO MESSAGE', 
                            stack: 'NO STACK TRACE'
                        });
                    }
                } else if (user_type === 'client'){
                    const login = loginUserPlanUpdate(user_id, 'plus');
                    if(login.error){
                        next({ 
                            statusCode: 500, 
                            title: 'SERVER ERROR', 
                            message: login.error_msg || 'NO MESSAGE', 
                            stack: 'NO STACK TRACE'
                        });
                    }
                }
            }
        ).catch(err => console.log(err.message))
        
    }
    // Return a 200 response to acknowledge receipt of the event
    res.send().end()
});

export { createPaymentIntent, paymentFulfillment }

