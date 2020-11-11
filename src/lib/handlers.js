/*
* Request handlers
*
*/

// @TODO: separate handlers into their own files.

// Dependencies
import _data from './data.js';
import helpers from './helpers.js';

// Object to be exported
var handlers = {};

// Users
handlers.users = (data, callback) => {
    let acceptableMethods = ['post', 'get', 'put', 'delete'];

    if (acceptableMethods.some(m => data.method === m)) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
}

// Container for the users submethods
handlers._users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
handlers._users.post = (data, callback) => {
    let firstName = typeof data.payload.firstName === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof data.payload.lastName === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let phone = typeof data.payload.phone === 'string' && data.payload.phone.trim().length > 0 ? data.payload.phone.trim() : false;
    let password = typeof data.payload.password === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    let tosAgreement = typeof data.payload.tosAgreement === 'boolean' ? data.payload.tosAgreement : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        // Make sure the user doesn't already exist
        _data.read('users', phone, (err, data) => {
            if (err) {
                // Hash the password
                let hashedPassword = helpers.hash(password);
                if (!hashedPassword) {
                    callback(500, { Error: 'Could not hash the user password.'});
                    return;
                }

                // Create user object
                let user = {
                    firstName,
                    lastName,
                    phone,
                    hashedPassword,
                    tosAgreement
                };

                // Store the user
                _data.create('users', phone, user, (err) => {
                    if (!err) {
                        callback(200);
                    } else {
                        console.log(err);
                        callback(500, { Error: 'Could not create the new user.'});
                    }
                })
            } else {
                // User already exist
                callback(400, { Error: 'A user with that phone number already exists.' });
            }
        });
    } else {
        callback(400, { Error: "Missing required fields" });
    }
}

// Users - get
// Required data: phone
// @TODO only let an authenticated user access their data
handlers._users.get = (data, callback) => {
    // Validate phone number
    let phone = typeof data.queryStringObject.phone === 'string' && data.queryStringObject.phone.trim().length > 0 ? data.queryStringObject.phone.trim() : false;

    if (phone) {
        // Lookup the user
        _data.read('users', phone, (err, data) => {
            if (!err && data) {
                delete data.hashedPassword;
                callback(200, data);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, { Error: 'Missing required field.' })
    }
}

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password, tosAgreement (at least one)
// @TODO only let an authenticated user update their data
handlers._users.put = (data, callback) => {
    // Check for the required fields
    let phone = typeof data.payload.phone === 'string' && data.payload.phone.trim().length > 0 ? data.payload.phone.trim() : false;

    // Optional fields
    let firstName = typeof data.payload.firstName === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof data.payload.lastName === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let password = typeof data.payload.password === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if (phone) {
        if (firstName || lastName || password) {
            // Lookup the user
            _data.read('users', phone, (err, userData) => {
                if (!err && userData) {
                    // Update the fields necessary
                    if (firstName) {
                        userData.firstName = firstName;
                    }
                    if (lastName) {
                        userData.lastName = lastName;
                    }
                    if (password) {
                        userData.hashedPassword = helpers.hash(password);
                    }

                    // Store the updated object
                    _data.update('users', phone, userData, (err) => {
                        if (!err) {
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, { Error: 'Could not update the user.' });
                        }
                    });
                } else {
                    callback(400, { Error: 'The specified user does not exist.' })
                }
            });
        } else {
            callback(400, "Missing fields to update.")
        }
    } else {
        callback(400, "Missing required field.");
    }
}

// Users - delete
// Required data: phone
// @TODO only let an authenticated user update their data
// @TODO Cleanup (delete) any other data files associated with this user
handlers._users.delete = (data, callback) => {
    // Validate phone number
    let phone = typeof data.queryStringObject.phone === 'string' && data.queryStringObject.phone.trim().length > 0 ? data.queryStringObject.phone.trim() : false;

    if (phone) {
        // Lookup the user
        _data.read('users', phone, (err, data) => {
            if (!err && data) {
                _data.delete('users', phone, (err) => {
                    if (!err) {
                        callback(200);
                    } else {
                        callback(500, { Error: 'Could not delete the specified user.' });
                    }
                })
            } else {
                callback(400, { Error: 'Could not find the specified user.' });
            }
        });
    } else {
        callback(400, { Error: 'Missing required field.' })
    }
}

// Ping handler
handlers.ping = (data, callback) => {
    callback(200);
}

// Not found handler
handlers.notFound = (data, callback) => {
    callback(404);
}

export default handlers;