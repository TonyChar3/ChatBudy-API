import crypto from 'crypto';
import Visitor from '../models/visitorsModels.js';
import User from '../models/userModels.js';
import jsonwebtoken from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pathToPrivKey = path.join(__dirname, '../', 'id_rsa_priv.pem');
const pathToPubKey = path.join(__dirname, '../', 'id_rsa_pub.pem');

const PRIV_KEY = fs.readFileSync(pathToPrivKey, 'utf8');
const PUB_KEY = fs.readFileSync(pathToPubKey, 'utf8');

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

/**
 * Update in real-time the visitor array
 */
const realTimeUpdated = async(hash) => {
  try{
    // get the user uid
    const user = await User.findOne({ user_access: hash })
    if(!user){
      throw new Error("User not found for the real-time update...please try again or contact support")
    }

    // get the new array
    const updatedVisitor = await Visitor.findById(hash);
    const updatedVisitorList = updatedVisitor.visitor;

    // Will return the updated array and the user.uid
    const updated_info ={
      userID: user._id,
      array: updatedVisitorList
    }
    return updated_info
  } catch(err){
    console.log(err)
  }
}

/**
 * Create a JWT with the new visitor ID's
 */
const generateJWT = async(visitor_id) => {
  try{
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
  } catch(err){
    console.log(err)
  }
}

/**
 * Insert the JWT into a httpOnly cookie
 */
const httpCookie = async(jwt_token) => {
  try{  

  } catch(err){
    console.log(err)
  }
}

/**
 * Decode the JWT sent back from the backend
 */
const decodeJWT = async(token) => {
  try{
    const decodeToken = jsonwebtoken.verify(token, PUB_KEY, { algorithms: 'RS256' })

    if(decodeToken){
      return decodeToken
    }
  } catch(err){
    console.log(err)
  }
}

export { generateRandomID, uniqueUserHash, getVisitorBrowser, realTimeUpdated, generateJWT, httpCookie, decodeJWT }