import asyncHandler from 'express-async-handler';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config()

const stripe = Stripe(process.env.SECRET_STRIPE);

//@desc to create the payment intent to the stripe API
const createPaymentIntent = asyncHandler( async(req,res,next) => {
    try{
        // create the checkout session with the Stripe API
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price: process.env.STRIPE_PRODUCT,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `http://10.0.0.78:5173/register`,
            cancel_url: `http://10.0.0.78:5173/register?canceled=true`,
            automatic_tax: {enabled: true},
        });
        // Send back the checkout UI url  
        res.redirect({ url: session.url});
    } catch(err){
        next(err)
    }
});
 
//@desc webhook for when the checkout is done
//@route POST /stripe/webhook
//@acess PUBLIC
const paymentFulfillment = asyncHandler( async(req,res,next) => {
  /**
   * This function is handle the webhook to fulfill the order after checkout.
   * -> This will clear the cart and create a new order in the DB
   */
    const endpointSecret = process.env.STRIPE_ENDPOINT
    const sig = req.headers['stripe-signature'];

    let data;
    let eventType;
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    data = event.data.object;
    eventType = event.type;
  
    // Handle the event
    if(eventType === 'checkout.session.completed'){
        stripe.customers.retrieve(data.customer).then(
            (customer) => {
                // manipulate user data
                console.log('payment fulfilled');
                console.log(customer)
            }
        ).catch(err => console.log(err.message))
    }
    // Return a 200 response to acknowledge receipt of the event
    res.send().end();
});

export { createPaymentIntent, paymentFulfillment }