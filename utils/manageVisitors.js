import crypto from 'crypto';
import Visitor from '../models/visitorsModels.js';
import User from '../models/userModels.js';

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
 * Make sure there no duplicate ID in the Visiotr Array
 */
const uniqueVisitorID = async(array_id) => {
    // generate the random id
    let visitor_uid;
    // flag for the uid duplicate check
    let uid_flag = true

    // find the visitor array
    const visitor_array = await Visitor.findById(array_id);
    if(!visitor_array){
        res.status(404);
        throw new Error("Error! The visitor array to modified wasn't found...please try again")
    }

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
}

/**
 * Make sure there's no duplicate hash for the User
 */
const uniqueUserHash = async() => {
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
}

/**
 * Get the visitor specific browser
 */
const getVisitorBrowser = async(browser_info) => {
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
  
    return {
      name: browserName,
      version: browserVersion
    };
}

export { generateRandomID, uniqueUserHash, uniqueVisitorID, getVisitorBrowser }