import crypto from 'crypto';
import Visitor from '../models/visitorsModels.js';
import User from '../models/userModels.js';
import jsonwebtoken from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendAdminFreshUpdatedInfo, sendWidgetVisitorNotifications } from './manageSSE.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pathToPrivKey = path.join(__dirname, '../', 'id_rsa_priv.pem');
const pathToPubKey = path.join(__dirname, '../', 'id_rsa_pub.pem');
const pathToWSPubKey = path.join(__dirname, '../', 'id_wss_pub.pem');
const pathToWSPrivKey = path.join(__dirname, '../', 'id_wss_priv.pem');

const PRIV_KEY = fs.readFileSync(pathToPrivKey, 'utf8');
const PUB_KEY = fs.readFileSync(pathToPubKey, 'utf8');
const WS_PUB_KEY = fs.readFileSync(pathToWSPubKey, 'utf8');
const WS_PRIV_KEY = fs.readFileSync(pathToWSPrivKey, 'utf8');

/**
 * Generate a random identifier for a visitor
 */
const generateRandomID = () => {
    const hash = crypto.createHash('sha256');
    const randomBytes = crypto.randomBytes(10);
    hash.update(randomBytes);
    const randomID = hash.digest('hex').substring(0,10);
    return randomID;
}
/**
 * Make sure there's no duplicate hash for the User
 */
const uniqueUserHash = async() => {
  try{
    // generate the random id
    let user_hash;
    // flag for the uid duplicate check
    let hash_flag = true
    // make sure there's no duplicate
    do {
        // generate the ID
        user_hash = generateRandomID();
        const check_duplicate = await User.findOne({ user_access: user_hash });
        if(check_duplicate){
            hash_flag = true;
        } else if(!check_duplicate){
            return user_hash;
        }
    } while (hash_flag === true);
  } catch(err){
    console.log('uniqueUserHash() at manageVisitors.js in utils: Fail to create a unique user hash. ', err.stack);
    return {
      error: true,
      error_msg: 'uniqueUserHash() at manageVisitors.js in utils: Fail to create a unique user hash',
      error_stack: err.stack || 'NO STACK TRACE.'
    }
  }
}
/**
* Visitor unique Identifier generator
*/
const uniqueVisitorID = async(array_id) => {
    // generate the random id
    let visitor_uid;
    // flag for the uid duplicate check
    let uid_flag = true
    try{
      // find the visitor array
      const visitor_array = await Visitor.findById(array_id);
      // do ... while
      do {
          // generate the ID
          visitor_uid = generateRandomID();
          
          const check_duplicate = visitor_array.visitor.findIndex(visitor => visitor._id.toString() === visitor_uid.toString());
          
          if(check_duplicate !== -1){
              uid_flag = true;
          } else if(check_duplicate === -1){
              uid_flag = false
          }
      } while (uid_flag === true); 
      return visitor_uid;
    } catch(err){
      console.log('uniqueVisitorID() at manageVisitors.js in utils: Fail to create a unique visitor id. ', err.stack);
      return {
        error: true,
        error_msg: 'uniqueVisitorID() at manageVisitors.js in utils: Fail to create a unique visitor id',
        error_stack: err.stack || 'NO STACK TRACE.'
      }
    }
}
/**
 * Get the visitor specific browser
 */
const getVisitorBrowser = (browser_info) => {
    const userAgent = browser_info;

    let browserName;
    let browserVersion;
  
    switch (true) {
      case userAgent.indexOf("Firefox") !== -1:
        browserName = "Mozilla Firefox";
        browserVersion = userAgent.match(/Firefox\/([\d.]+)/)[1];
        break;
      case userAgent.indexOf("Chrome") !== -1:
        browserName = "Google Chrome";
        browserVersion = userAgent.match(/Chrome\/([\d.]+)/)[1];
        break;
      case userAgent.indexOf("Safari") !== -1:
        browserName = "Safari";
        browserVersion = userAgent.match(/Version\/([\d.]+)/)[1];
        break;
      case userAgent.indexOf("MSIE") !== -1 || userAgent.indexOf("Trident/") !== -1:
        browserName = "Internet Explorer";
        browserVersion = userAgent.match(/(?:MSIE |rv:)(\d+(\.\d+)?)/)[1];
        break;
      case userAgent.indexOf("Edge") !== -1:
        browserName = "Microsoft Edge";
        browserVersion = userAgent.match(/Edge\/([\d.]+)/)[1];
        break;
      default:
        browserName = "Unknown";
        browserVersion = "Unknown";
        break;
    }
    // return browser object
    return {
      name: browserName,
      version: browserVersion
    };
}
/**
 * Create a JWT with the new visitor ID's
 */
const generateJWT = (visitor_id, user_hash, login_user) => {
  try{
    // for the visitor to connect to the WS server
    if(visitor_id && !user_hash){
      const _id = visitor_id;
      const payload = {
        id: _id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (48 * 60 * 60)
      };
      const signedToken = jsonwebtoken.sign(payload, PRIV_KEY, { algorithm: 'RS256' });
      return {
        jwtToken: signedToken
      }
    // for the admin to connect to the WS server
    } else if(visitor_id && user_hash && login_user){
      const _id = visitor_id;
      const userHash = user_hash;
      const log_in_user = login_user
      const payload = {
        id: _id,
        userHash: userHash,
        logIN: log_in_user,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (48 * 60 * 60)
      };
      const signedToken = jsonwebtoken.sign(payload, WS_PRIV_KEY, { algorithm: 'RS256' });
      return {
        jwtToken: signedToken
      }
    }
  } catch(err){
    console.log('generateJWT() at manageVisitors.js in utils: Unable to generate a fresh JWT token. ', err.stack);
    return {
      error: true,
      error_msg: 'generateJWT() at manageVisitors.js in utils: Unable to generate a fresh JWT token.',
      error_stack: err.stack || 'NO STACK TRACE.'
    }
  }
}
/**
 * Decode the JWT sent back from the backend
 */
const decodeJWT = async(token, type_name) => {
  try{
    let decodeToken;
    switch (type_name){
      case "WS":
        decodeToken = jsonwebtoken.verify(token, WS_PUB_KEY, { algorithms: 'RS256' })
        break;
      case "Visitor":
        decodeToken = jsonwebtoken.verify(token, PUB_KEY, { algorithms: 'RS256' })
      default: 
        break;
    }
    if(decodeToken){
      return decodeToken
    } else if (!decodeToken){
      return false
    }
  } catch(err){
    console.log('ERROR decodeJWT(): ', err);
    return {}
  }
}
/**
 * Set the visitor email section
 */
const setVisitorEmail = async(user_hash, visitor_id, email) => {
  try{
    // find user visitor collection
    const visitor_collection = await Visitor.findById(user_hash);
    // get the visitor object index in the user visitor array
    const visitor_index = visitor_collection.visitor.findIndex(visitor => visitor._id.toString() === visitor_id.toString());
    // set the new field
    visitor_collection.visitor[visitor_index].email = email;
    // save it
    await visitor_collection.save();
    // send new info to the admin panel
    sendAdminFreshUpdatedInfo(user_hash, visitor_collection.visitor);
    return true;
  } catch(err){
    console.log('setVisitorEmail() at manageVisitors.js in utils: Cannot set new visitor email. ', err.stack);
    return {
      error: true,
      error_msg: 'setVisitorEmail() at manageVisitors.js in utils: Cannot set new visitor email',
      error_stack: err.stack || 'NO STACK TRACE.'
    }
  }
}
/**
 * Check the request limit objects in the redis cache
 */
const checkRequestCache = async(redis_client, obj_email) => {
  try{
    const cached_object = await redis_client.get(obj_email);
    if (!cached_object){
      // set the new obj in the db 1
      await redis_client.set(obj_email, JSON.stringify(1), "EX", 86400);
      return true
    }
    let count = JSON.parse(cached_object)
    if(count === 3){
      const block_request = await redis_client.expire(obj_email, 10);
      if(block_request){
        return false
      }
    } else if (count <= 3){
      const increment_count = count += 1
      await redis_client.set(obj_email, JSON.stringify(increment_count), "EX", 86400);
      return true
    }
  } catch(err){
    console.log('checkRequestCache() at manageVisitors.js in utils: Nothing found during cache check. ', err.stack);
    return {
      error: true,
      error_msg: 'checkRequestCache() at manageVisitors.js in utils: Nothing found during cache check',
      error_stack: err.stack || 'NO STACK TRACE.'
    }
  }
}
/**
 * Authenticate the visitor to set up the SSE connection
 */
const visitorSSEAuth = async(req) => {
  try{
      // decode the cookie and validate the JWT
      //TODO: Uncomment this for production to use httpOnly cookies
      // const cookie_value = req.cookies
      const cookie_value = req.headers.authorization.split(' ')[1]
      if(!cookie_value){
        return
      }
      // verify and decode the JWT token in the cookie
      const decoded = await decodeJWT(cookie_value, 'Visitor');
      if(!decoded){
        return {}
      }
      return decoded
  } catch(err){
    console.log('visitorSSEAuth() at manageVisitors.js in utils: SSE authentication failed. ', err.stack);
    return {
      error: true,
      error_msg: 'visitorSSEAuth() at manageVisitors.js in utils: SSE authentication failed',
      error_stack: err.stack || 'NO STACK TRACE.'
    }
  }
}
/**
 * Send visitor his new chats notifications
 */
const sendVisitorNotification = async(user_access, visitor_id) => {
  try{
    // get the correct visitor collection
    const visitor_collection = await Visitor.findById(user_access);
    if(!visitor_collection){
      return
    }
    // get the array of notification
    const visitor_index = visitor_collection.visitor.findIndex(visitor => visitor._id === visitor_id.toString());
    if(visitor_index === -1){
      return
    }
    // send the notification
    const visitor_notifications = visitor_collection.visitor[visitor_index].notifications
    sendWidgetVisitorNotifications(visitor_id, visitor_notifications);
  } catch(err){
    console.log('ERROR sendVisitorNotification(): ', err);
    return
  }
}
/**
 * Clear the visitors notifications when he opens the widget and the SSE closes
 */
const clearVisitorNotifications = async(user_access, visitor_id) =>{
  try{
    // find the visitor collection with the user_access
    const visitor_collection = await Visitor.findById(user_access);
    if(!visitor_collection){
      return;
    }
    // inside the visitor collection visitor array find the index
    const visitor_index = visitor_collection.visitor.findIndex(visitor => visitor._id.toString() === visitor_id.toString());
    if(visitor_index === -1){
      return;
    }
    // clear up the notifications array
    visitor_collection.visitor[visitor_index].notifications = []
    // save()
    await visitor_collection.save();
    sendWidgetVisitorNotifications(visitor_id, []);
  } catch(err){
    console.log('ERROR clearVisitorNotifications(): ',err);
    return
  }
}
/**
 * Increment BrowserData object
 */
const setBrowserData = async(browser_name, visitor_collection) => {
  try{
    // find out if there's already an object with todays date
    const browser_data_index = visitor_collection.browserData.findIndex((data) => data.browser.toString() === browser_name.toString());
    if(browser_data_index !== -1){
      visitor_collection.browserData[browser_data_index].count +=1
      return
    }
    // if nothing was found
    const new_browser_data = {
      browser: browser_name,
      count: 1
    }
    visitor_collection.browserData.push(new_browser_data);
    return

  } catch(err){
    console.log('ERROR setBrowserData(): ', err);
    return
  }
}
/**
 * Increment visitorData object
 */
const setVisitorData = async(visitor_collection) => {
  try{
    // get todays date
    const today = new Date();
    // find out if there's already an object with todays date
    const visitor_data_index = visitor_collection.visitorData.findIndex((data) => data.createdAt.toDateString() === today.toDateString());
    if(visitor_data_index !== -1){
      visitor_collection.visitorData[visitor_data_index].visitor_count += 1
      return
    }
    // if nothing is found
    const new_visitor_data = {
      visitor_count: 1
    }
    visitor_collection.visitorData.push(new_visitor_data);
    return

  } catch(err){
    console.log('ERROR setVisitorData()', err);
    return
  }
}

export { 
  generateRandomID, 
  uniqueUserHash,
  uniqueVisitorID, 
  getVisitorBrowser, 
  generateJWT, 
  decodeJWT,  
  setVisitorEmail, 
  checkRequestCache, 
  visitorSSEAuth,
  sendVisitorNotification,
  clearVisitorNotifications,
  setBrowserData,
  setVisitorData }