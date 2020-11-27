/*
*   Helpers for various tasks
*
*/

// Dependencies
import crypto from 'crypto';
import config from './config.js'
import querystring from 'querystring';
import https from 'https';
import path from 'path';
import fs from 'fs';

// Container for all the helpers
var helpers = {};

// Base directory of the template folder
const rootPath = path.resolve();
const templateDir = path.join(rootPath, rootPath.substr(rootPath.length - 3, 3) === "src" ? '' : 'src', '/templates/');

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

// Get the string content of a template
helpers.getTemplate = (templateName, data, callback) => {
    templateName = typeof templateName == 'string' && templateName.length > 0 ? templateName : false;
    data = typeof data == "object" && data ? data : {};

    if (templateName) {
        fs.readFile(templateDir + templateName + '.html', 'utf8', (err, str) => {
            if (!err && str) {
                callback(false, helpers.interpolate(str, data));
            } else {
                callback('No template could be found.');
            }
        });
    } else {
        callback('A valid template name was not specified.');
    }
}

// Add the universal header and footer to a string
helpers.addUniversalTemplates = (str, data, callback) => {
    str = typeof str == 'string' && str.length > 0 ? str : false;
    data = typeof data == "object" && data ? data : {};

    // Get the header
    helpers.getTemplate('_header', data, (err, headerString) => {
        if (!err && headerString) {
            // Get the foother
            helpers.getTemplate('_footer', data, (err, footerString) => {
                if (!err && footerString) {
                    let fullString = headerString + str + footerString;
                    callback(false, fullString);
                } else {
                    callback('Could not find the footer template.');
                }
            })
        } else {
            callback('Could not find the header template')
        }
    })
}

// Take a given string and a data object and find/replace all the keys within it
helpers.interpolate = (str, data) => {
    str = typeof str == "string" && str.length ? str : '';
    data = typeof data == "object" && data ? data : {};

    for (let keyName in data) {
        let find = '{' + keyName + '}';
        let value = data[keyName];
        str = str.replace(find, value);
    }

    return str;
}

helpers.joinGlobalData = (data) => {
    data = typeof data == "object" && data ? data : {};

    let globals = {};
    for (let keyName in config.templateGlobals) {
        globals['global.' + keyName] = config.templateGlobals[keyName];
    }

    return {...data, ...globals};
}

// Export the module
export default helpers;