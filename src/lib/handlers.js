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
handlers._users.get = (data, callback) => {
    // Validate phone number
    let phone = typeof data.queryStringObject.phone === 'string' && data.queryStringObject.phone.trim().length > 0 ? data.queryStringObject.phone.trim() : false;

    if (phone) {
        // Verify token from headers is valid
        let tokenId = typeof data.headers.token === 'string' ? data.headers.token : false;
        handlers._tokens.verifyToken(tokenId, phone, (isValid) => {
            if (isValid) {
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
                callback(403, { Error: "Specified token is not valid." })
            }
        });
    } else {
        callback(400, { Error: 'Missing required field.' });
    }
}

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password, tosAgreement (at least one)
handlers._users.put = (data, callback) => {
    // Check for the required fields
    let phone = typeof data.payload.phone === 'string' && data.payload.phone.trim().length > 0 ? data.payload.phone.trim() : false;

    // Optional fields
    let firstName = typeof data.payload.firstName === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof data.payload.lastName === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let password = typeof data.payload.password === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if (phone) {
        // Verify token from headers is valid
        let tokenId = typeof data.headers.token === 'string' ? data.headers.token : false;
        handlers._tokens.verifyToken(tokenId, phone, (isValid) => {
            if (isValid) {
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
                callback(403, { Error: "Specified token is not valid." })
            }
        });
    } else {
        callback(400, "Missing required field.");
    }
}

// Users - delete
// Required data: phone
// @TODO Cleanup (delete) any other data files associated with this user
handlers._users.delete = (data, callback) => {
    // Validate phone number
    let phone = typeof data.queryStringObject.phone === 'string' && data.queryStringObject.phone.trim().length > 0 ? data.queryStringObject.phone.trim() : false;

    if (phone) {
        let tokenId = typeof data.headers.token === 'string' ? data.headers.token : false;
        handlers._tokens.verifyToken(tokenId, phone, (isValid) => {
            if (isValid) {
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
                callback(403, { Error: "Specified token is not valid." })
            }
        });
    } else {
        callback(400, { Error: 'Missing required field.' })
    }
}

// Tokens
handlers.tokens = (data, callback) => {
    let acceptableMethods = ['post', 'get', 'put', 'delete'];

    if (acceptableMethods.some(m => data.method === m)) {
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405);
    }
}

// Container for the tokens submethods
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
handlers._tokens.post = (data, callback) => {
    let phone = typeof data.payload.phone === 'string' && data.payload.phone.trim().length > 0 ? data.payload.phone.trim() : false;
    let password = typeof data.payload.password === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    
    if (phone && password) {
        // Lookup the user who matches that phone number
        _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
                let hashedPassword = helpers.hash(password);
                if (hashedPassword == userData.hashedPassword) {
                    // If valid, create a new token with a randome name. Set expiration date 1 hour in the future.
                    let tokenId = helpers.createRandomString(20);
                    let expires = Date.now() + 1000 * 60 * 60;
                    let token = {
                        id: tokenId,
                        phone,
                        expires
                    };

                    // Store the token
                    _data.create('tokens', tokenId, token, (err) => {
                        if (!err) {
                            callback(200, token);
                        } else {
                            callback(500, { Error: "Could not create new token. " + err });
                        }
                    });
                } else {
                    callback(400, { Error: "Password didn't match with user" });
                }
            } else {
                callback(400, { Error: "Could not find the specified user" });
            }
        })
    } else {
        callback(400, { Error: "Missing required fields" });
    }
}

// Tokens - get
// Required data: id
handlers._tokens.get = (data, callback) => {
    // Validate token id
    let id = typeof data.queryStringObject.id === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;

    if (id) {
        // Lookup the token
        _data.read('tokens', id, (err, token) => {
            if (!err && token) {
                callback(200, token);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, { Error: 'Missing required field.' });
    }
}

// Tokens - put
// Required data: id, extend
handlers._tokens.put = (data, callback) => {
    // Check for the required fields
    let id = typeof data.payload.id === 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
    let extend = typeof data.payload.extend === 'boolean' ? data.payload.extend : false;
    
    if (id && extend) {
        // Lookup the token
        _data.read('tokens', id, (err, tokenData) => {
            if (!err && tokenData) {
                // Check if the token is hasn't expired
                if (tokenData.expires > Date.now()) {
                    tokenData.expires = Date.now() + 1000 * 60 * 60;
                    
                    // Store the updated object
                    _data.update('tokens', id, tokenData, (err) => {
                        if (!err) {
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, { Error: 'Could not update the token.' });
                        }
                    });
                } else {
                    callback(400, { Error: 'Your token already expired.' });
                }
            } else {
                callback(400, { Error: 'The specified token does not exist.' })
            }
        });
    } else {
        callback(400, "Missing required field.");
    }
}

// Tokens - delete
// Required data: id
handlers._tokens.delete = (data, callback) => {
    // Validate id
    let id = typeof data.queryStringObject.id === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;

    if (id) {
        // Lookup the token
        _data.read('tokens', id, (err, data) => {
            if (!err && data) {
                _data.delete('tokens', id, (err) => {
                    if (!err) {
                        callback(200);
                    } else {
                        callback(500, { Error: 'Could not delete the specified token.' });
                    }
                })
            } else {
                callback(400, { Error: 'Could not find the specified token.' });
            }
        });
    } else {
        callback(400, { Error: 'Missing required field.' })
    }
}

// Verify if token is valid for a given user
handlers._tokens.verifyToken = (id, phone, callback) => {
    console.log(id)
    // Lookup the token
    _data.read('tokens', id, (err, token) => {
        if (!err && token) {
            // Check that the token is for the given user and hasn't expired
            if (token.phone == phone && token.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
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