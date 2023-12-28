import asyncHandler from 'express-async-handler';
import { stripeInstance } from '../server.js';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { registerPlusSubs, loginUserPlanUpdate } from '../utils/managePlusSubscriber.js';
import { VerifyFirebaseToken } from '../middleware/authHandle.js';

dotenv.config()

//@desc to create the payment intent to the stripe API
const createPaymentIntent = asyncHandler( async(req,res,next) => {
    try{
        const { user_type, user_id, user_data } = req.body
        const decode_token = await admin.auth().verifyIdToken(user_id)
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
            success_url: `${user_type === 'new_client'? `https://www.chatbudy.io/register?success=true` : user_type === 'logged_client'? 'https://www.chatbudy.io/navbar/setting?success=true' : 'https://www.chatbudy.io/login?success=true'}`,
            cancel_url: `${user_type === 'new_client'? 'https://www.chatbudy.io/register?canceled=true' : user_type === 'logged_client'? 'https://www.chatbudy.io/navbar/setting?canceled=true' : 'https://www.chatbudy.io/login?canceled=true'}`,
            automatic_tax: { enabled: true },
            customer_update: {
                address: 'auto',
            }
        });
        // Send back the checkout UI url  
        res.send({ url: session.url });
    } catch(err){
        next(err)
    }
});

//@desc to start a customer portal session for the user to manage his subscriptions PLus
//@route POST /stripe/customer-portal
//@access PRIVATE
const startPortalSession = asyncHandler( async(req, res, next) => {
    try{
        let customer_stripe_id;
        // verify the firebase token
        const decode_token = await VerifyFirebaseToken(req,res);
        // find the user with matching uid
        const customers = await stripeInstance.customers.list();
        customers.data.forEach(customer => {
            if(customer.metadata.userId.toString() === decode_token.uid.toString()){
                customer_stripe_id = customer.id
            }
        })
        // start portal session
        const session = await stripeInstance.billingPortal.sessions.create({
            customer: customer_stripe_id,
            return_url: 'https://www.chatbudy.io/navbar/setting?portal=true',
        });
        // return the url
        res.send({ url: session.url })
    } catch(err){
        next({ 
            statusCode: 500, 
            title: 'SERVER ERROR', 
            message: err, 
            stack: err.stack 
        });
    }
})
 
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
  
    // Checkout session completed
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
                } else if (user_type === 'client' || user_type === 'logged_user'){
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
    } else if (eventType === 'customer.subscription.updated'){
        // if the subscription is cancelled
        if(data.cancel_at_period_end){
            stripeInstance.customers.retrieve(data.customer).then((customer) => {
                // set plan to standard in the db
                const switch_plan = loginUserPlanUpdate(customer.metadata.userId, 'pending_removal');
                if(switch_plan.error){
                    throw new Error('Error switching using plan to standard.')
                }
            }).catch(err => {
                next({ 
                    statusCode: 500, 
                    title: 'SERVER ERROR', 
                    message: err || 'NO MESSAGE', 
                    stack: err.stack || 'NO STACK TRACE.'
                });
                return;
            }) 
        } else if (!data.cancel_at_period_end){
            stripeInstance.customers.retrieve(data.customer).then((customer) => {
                // set plan to plus in the db
                const switch_plan = loginUserPlanUpdate(customer.metadata.userId, 'plus');
                if(switch_plan.error){
                    throw new Error('Error switching using plan to standard.')
                }
            }).catch(err => {
                next({ 
                    statusCode: 500, 
                    title: 'SERVER ERROR', 
                    message: err || 'NO MESSAGE', 
                    stack: err.stack || 'NO STACK TRACE.'
                });
                return;
            }) 
        }
    } else if (eventType === 'customer.subscription.deleted'){
        // find the matching customer
        stripeInstance.customers.retrieve(data.customer).then((customer) => {
            // set plan to standard in the db
            const switch_plan = loginUserPlanUpdate(customer.metadata.userId, 'standard');
            if(switch_plan.error){
                throw new Error('Error switching using plan to standard.')
            }
        }).catch(err => {
            next({ 
                statusCode: 500, 
                title: 'SERVER ERROR', 
                message: err || 'NO MESSAGE', 
                stack: err.stack || 'NO STACK TRACE.'
            });
            return;
        })
        // delete from stripe customer list
        stripeInstance.customers.del(data.customer);
    }
    // Return a 200 response to acknowledge receipt of the event
    res.send().end()
});

export { createPaymentIntent, paymentFulfillment, startPortalSession }

