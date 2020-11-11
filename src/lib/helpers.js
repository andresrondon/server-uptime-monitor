/*
*   Helpers for various tasks
*
*/

// Dependencies
import crypto from 'crypto';
import config from './config.js'

// Container for all the helpers
var helpers = {};

// Create a SHA256 hash
helpers.hash = (string) => {
    if (typeof string === 'string' && string.length > 0) {
        let hash = crypto.createHmac('sha256', config.hashingSecret).update(string).digest('hex');
        return hash;
    } else {
        return false;
    }
}

// Parse a JSON string to an object without throwing an error
helpers.parse = (string) => {
    let obj = {};

    try {
        obj = JSON.parse(string);
    } catch (e) {
        console.log("Tried to parse incorrect JSON string. Returning an empty object.");
    }

    return obj;
}

// Export the module
export default helpers;