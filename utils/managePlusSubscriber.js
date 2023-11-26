import User from '../models/userModels.js';
import Widget from '../models/widgetModels.js';
import Visitors from '../models/visitorsModels.js';
import ChatRoom from '../models/chatRoomModels.js';
import { uniqueUserHash } from '../utils/manageVisitors.js';
import admin from 'firebase-admin';
import { stripeInstance } from '../server.js';

/**
 * Register the user data to the persistent storage
 */
let custom_err_message;

const registerPlusSubs = async(uid, web_url, username, plan) => {
    try{
        const url_regex = /^https:\/\/(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}[^ ]*$/
        const username_regex = /^[a-zA-Z0-9]+([\s._][a-zA-Z0-9]+)?$/
        // get the user data
        const firebase_user_data = await admin.auth().getUser(uid);
        if(!firebase_user_data){
            custom_err_message = 'Firebase user data not found';
            throw new Error('No firebase data found')
        }
        // generate a unique user hash
        const u_hash = await uniqueUserHash();
        if(u_hash.error){
            custom_err_message = u_hash.error_msg;
            throw new Error('No hash avaible')
        }
        // sanitize the url and the username with regex
        if(!url_regex.test(web_url)){
            custom_err_message = 'Invalid website url';
            throw new Error('No hash avaible')
        }
        if(!username_regex.test(username)){
            custom_err_message = 'Invalid user name';
            throw new Error('No hash avaible')
        }
        // write to DB the new collection objects
        const [user, widget, visitor, chatroom] = await Promise.all([
            // create new User
            User.create({
                _id: uid,
                user_access: u_hash,
                username: username,
                email: firebase_user_data.email,
                current_plan: plan
            }),
            // create new widget
            Widget.create({
                _id: u_hash,
                domain: web_url,
                customization: {
                    position: "right",
                    shape: "square",
                    main_color: "#6C2E9C",
                    offline_message: "We are currently unavaible right now, please provide your email and we will get back to you as soon as possible 🙃!",
                    greeting_message: "Hi! Want to know about our special offer 👀?",
                    admin_name: "Support agent 🤖",
                    font_color: "light"
                }
            }),
            // create Visitor collection object
            Visitors.create({
                _id: u_hash
            }),
            ChatRoom.create({
                _id: u_hash
            })
        ]);
        switch (!user || !widget || !visitor || !chatroom){
            case !user:
                custom_err_message = 'Unable to create a new User';
                throw new Error('User data not created')
                break;
            case !widget:
                custom_err_message = 'Unable to create a new Widget';
                throw new Error('Widget not created')
                break;
            case !visitor:
                custom_err_message = 'Unable to create a new Visitor collection';
                throw new Error('Visitor collection not set')
                break;
            case !chatroom:
                custom_err_message = 'Unable to create a new Chatroom collection';
                throw new Error('Chatroom collection not set')
                break;
            default:
                break;
        }
        return true
    } catch(err){
        return {
            error: true,
            error_msg: custom_err_message || 'Unable to set user data to persistent storage'
        }
    }
}

/**
 * Change the logged in user plan in the persistent storage
 */
const loginUserPlanUpdate = async(uid, new_plan) => {
    try{
        // update what was updated
        await User.findByIdAndUpdate(
            {_id: uid},
            {
                $set: {
                    current_plan: new_plan
                }
            },
            { new:true }
        );
    } catch{
        return {
            error: true,
            error_msg: 'Unable to update the user plan'
        }
    }
}

/**
 * Cancel and delete user from stripe customer
 */
const cancelStripePlusPlan = async(uid) => {
    try{
        // find the user with matching uid
        const customers = await stripeInstance.customers.list();
        const subscription = await stripeInstance.subscriptions.list();
        // find the stripe customer
        const stripe_customer = customers.data.find(user => {
            return user.metadata.userId.toString() === uid.toString()
        })
        // find the user subscription
        const stripe_subscription = subscription.data.find(sub => {
            return sub.customer.toString() === stripe_customer.id.toString()
        })
        // cancel the subscription
        stripeInstance.subscriptions.cancel(stripe_subscription.id);
        // delete the stripe customer
        stripeInstance.customers.del(stripe_customer.id);
        return
    } catch(err){
        return {
            error: true,
            error_msg: 'Error cancelling and deleting from Stripe customers.'
        }
    }
}
export { registerPlusSubs, loginUserPlanUpdate, cancelStripePlusPlan }