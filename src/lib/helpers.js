/*
*   Helpers for various tasks
*
*/

// Dependencies
import crypto from 'crypto';
import config from './config.js'
import querystring from 'querystring';
import https from 'https';

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

// Create a string of random alphanumeric characters of a given length
helpers.createRandomString = (length) => {
    let string = "";
    
    length = typeof length === 'number' && length > 0 ? length : false;
    if (length) {
        let possibleCharacters = 'abcdefgijklmnopqrstuvwxyz0123456789';

        for (let i = 1; i <= length; i++) {
            let randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
            string += randomCharacter;
        }
    }

    return string
}

helpers.sendTwilioSms = function (phone, message, callback) {
    // Validate parameters
    phone = typeof phone == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    message = typeof message == 'string' && message.trim().length > 0 && message.trim().length <= 1600 ? message.trim() : false;

    if (phone && message) {
        // Configure the request payload
        var postData = querystring.stringify({
            'From' : config.twilio.fromPhone,
            'To' : '+1'+phone,
            'Body' : message
        });

        var options = {
            'protocol' : 'https:',
            'method': 'POST',
            'hostname': 'api.twilio.com',
            'path': `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
            'auth' : config.twilio.accountSid + ':' + config.twilio.authToken,
            'headers': {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(postData)
            }
        };

        var req = https.request(options, (res) => {
            var chunks = [];

            res.on("data", (chunk) => {
                    chunks.push(chunk);
                });

            res.on("end", (chunk) => {
                let status = res.statusCode;
                // Callback successfully if the request went through
                if (status == 200 || status == 201) {
                    callback(false);
                } else {
                    let body = Buffer.concat(chunks);
                    callback('Status code returned was ' + status, body.toString());
                }
            });

            res.on("error", callback);
        });

        req.write(postData);

        req.end();
    } else {
        callback("Given parameters were missing or invalid");
    }
}

// Export the module
export default helpers;