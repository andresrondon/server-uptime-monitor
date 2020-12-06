/*
* Request handlers
*
*/

// @TODO: separate handlers into their own files.

// Dependencies
import config from './config.js';
import _data from './data.js';
import helpers from './helpers.js';
import _url from 'url';
import dns from 'dns';
import { performance as _performance } from 'perf_hooks';
import util from 'util';
const debug = util.debuglog('performance');

// Object to be exported
var handlers = {};

/*
* HTML Handlers
*
*/

handlers.getPageLoader = (title, description, templateName) => (data, callback) => {
    // Reject any request that isn't a GET
    if (data.method == 'get') {
        // Prepare data for interpolation
        let templateData = helpers.joinGlobalData({
            'head.title': title,
            'head.description': description,
            'body.class': templateName
        });

        helpers.getTemplate(templateName, templateData, (err, str) => {
            if (!err && str) {
                helpers.addUniversalTemplates(str, templateData, (err, str) => {
                    if (!err && str) {
                        callback(200, str, 'html');
                    } else {
                        callback(500, undefined, 'html');
                    }
                })
            } else {
                callback(500, undefined, 'html');
            }
        })
    } else {
        callback(405, undefined, 'html');
    }
}

// Index handler
handlers.index = handlers.getPageLoader('Home', 'Uptime monitoring made simple', 'index');

// Create Account
handlers.accountCreate = handlers.getPageLoader('Create an Account', 'Singup is easy and only takes a few seconds.', 'accountCreate');

// Create New Session
handlers.sessionCreate = handlers.getPageLoader('Log in to your Account', 'Please enter your phone number and password to access your account.', 'sessionCreate');

// Session has been deleted
handlers.sessionDeleted = handlers.getPageLoader('Log in to your Account', 'You have been logged out from your account.', 'sessionDeleted');

// Edit your account
handlers.accountEdit = handlers.getPageLoader('Account Settings', '', 'accountEdit');

// Account has been deleted
handlers.accountDeleted = handlers.getPageLoader('Account Deleted', 'Your account has been deleted.', 'accountDeleted');

// Create a new check
handlers.checksCreate = handlers.getPageLoader('Create a New Check', '', 'checksCreate');

// Dashboard (view all checks)
handlers.checksList = handlers.getPageLoader('Dashboard', '', 'checksList');

// Edit a check
handlers.checksEdit = handlers.getPageLoader('Checks Details', '', 'cheksEdit');

// Favicon
handlers.favicon = (data, callback) => {
    // Reject any request that isn't a GET
    if (data.method == 'get') {
        // Read in the favicon's data

        helpers.getStaticAsset('favicon.ico', (err, data) => {
            if (!err && data) {
                callback(200, data, 'favicon');
            } else {
                callback(500);
            }
        });
    } else {
        callback(405);
    }
}

// Public assets
handlers.public = (data, callback) => {
    // Reject any request that isn't a GET
    if (data.method == 'get') {
        // Get the filename being requested
        let assetName = data.trimmedPath.replace('public/', '').trim();
        if (assetName.length > 0) {
            helpers.getStaticAsset(assetName, (err, data) => {
                if (!err && data) {
                    // Determine the content type
                    let contentType = 'plain';

                    if (assetName.includes('.css')) {
                        contentType = 'css';
                    } else if (assetName.includes('.png')) {
                        contentType = 'png';
                    } else if (assetName.includes('.jpg')) {
                        contentType = 'jpg';
                    } else if (assetName.includes('.ico')) {
                        contentType = 'favicon';
                    } else if (assetName.includes('.js')) {
                        contentType = 'javascript';
                    }
                    
                    callback(200, data, contentType);
                } else {
                    console.log(err, data);
                    callback(404);
                }
            });
        } else {
            callback(404);
        }
    } else {
        callback(405);
    }
}

/*
* JSON API Handlers
*
*/

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
                    callback(500, { Error: 'Could not hash the user password.' });
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
                        callback(500, { Error: 'Could not create the new user.' });
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
                                    callback(500, { Error: 'Could not update the user.' + err });
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
handlers._users.delete = (data, callback) => {
    // Validate phone number
    let phone = typeof data.queryStringObject.phone === 'string' && data.queryStringObject.phone.trim().length > 0 ? data.queryStringObject.phone.trim() : false;

    if (phone) {
        let tokenId = typeof data.headers.token === 'string' ? data.headers.token : false;
        handlers._tokens.verifyToken(tokenId, phone, (isValid) => {
            if (isValid) {
                // Lookup the user
                _data.read('users', phone, (err, userData) => {
                    if (!err && userData) {
                        _data.delete('users', phone, (err) => {
                            if (!err) {
                                // Delete all of the checks associated with this user
                                let userChecks = userData.checks instanceof Array ? userData.checks : [];
                                let checksToDelete = userChecks.length;

                                if (checksToDelete > 0) {
                                    let checksDeleted = 0;
                                    let deletionErrors = false;

                                    for (let checkId of userChecks) {
                                        _data.delete('checks', checkId, (err) => {
                                            if (err) {
                                                deletionErrors = true;
                                            }
                                            checksDeleted++;
                                            if (checksDeleted == checksToDelete) {
                                                if (!deletionErrors) {
                                                    callback(200);
                                                } else {
                                                    callback(500, { Error: "Errors encountered while attempting to delete all user's checks."});
                                                }
                                            }
                                        })
                                    }
                                } else {
                                    callback(200);
                                }
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
    _performance.mark('entered function');
    let phone = typeof data.payload.phone === 'string' && data.payload.phone.trim().length > 0 ? data.payload.phone.trim() : false;
    let password = typeof data.payload.password === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    _performance.mark('inputs validated');

    if (phone && password) {
        // Lookup the user who matches that phone number
        _performance.mark('beginning user lookup');
        _data.read('users', phone, (err, userData) => {
            _performance.mark('user lookup complete');
            if (!err && userData) {
                _performance.mark('beginning password hashing');
                let hashedPassword = helpers.hash(password);
                _performance.mark('password hashing complete');
                if (hashedPassword == userData.hashedPassword) {
                    _performance.mark('creating data for token');
                    // If valid, create a new token with a randome name. Set expiration date 1 hour in the future.
                    let tokenId = helpers.createRandomString(20);
                    let expires = Date.now() + 1000 * 60 * 60;
                    let token = {
                        id: tokenId,
                        phone,
                        expires
                    };

                    // Store the token
                    _performance.mark('begining storing token');
                    _data.create('tokens', tokenId, token, (err) => {
                        _performance.mark('storing token complete');

                        // Gather all te measurements
                        _performance.measure('Beginning to end', 'entered function', 'storing token complete');
                        _performance.measure('Validating user input', 'entered function', 'inputs validated');
                        _performance.measure('User lookup', 'beginning user lookup', 'password hashing complete');
                        _performance.measure('Password hashing', 'beginning password hashing', 'password hashing complete');
                        _performance.measure('Token data creation', 'creating data for token', 'beginning storing token');
                        _performance.measure('Token storing', 'beginning storing token', 'storing token complete');

                        // Log out all the measurements
                        let measurements = _performance.getEntriesByType('measure');
                        for (let measurement of measurements) {
                            debug('\x1b[33m%s\x1b[0m', `${measurement.name} ${measurement.duration}`)
                        }

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
                            callback(500, { Error: 'Could not update the token.' + err });
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

// Checks
handlers.checks = (data, callback) => {
    let acceptableMethods = ['post', 'get', 'put', 'delete'];

    if (acceptableMethods.some(m => data.method === m)) {
        handlers._checks[data.method](data, callback);
    } else {
        callback(405);
    }
}

// Container for the checks submethods
handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
handlers._checks.post = (data, callback) => {
    let protocol = typeof data.payload.protocol === 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol.trim() : false;
    let url = typeof data.payload.url === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    let method = typeof data.payload.method === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method.trim() : false;
    let successCodes = data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    let timeoutSeconds = typeof data.payload.timeoutSeconds === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (protocol && url && method && successCodes && timeoutSeconds) {
        
        // Lookup the user phone by reading the token
        let tokenId = typeof data.headers.token === 'string' ? data.headers.token : false;
        _data.read('tokens', tokenId, (err, token) => {
            if (!err && token) {
                let userPhone = token.phone;
                _data.read('users', userPhone, (err, userData) => {
                    if (!err && userData) {
                        let userChecks = userData.checks instanceof Array ? userData.checks : [];

                        // Verify that the user has less checks than the max number per user
                        if (userChecks.length < config.maxChecks) {
                            // Verify that the URL given has DNS entries
                            let parsedUrl = _url.parse(protocol + '://' + url, true);
                            let hostname = typeof parsedUrl.hostname === 'string' && parsedUrl.hostname.length > 0 ? parsedUrl.hostname : false;
                            dns.resolve(hostname, (err, records) => {
                                if (!err && records) {
                                    // If valid, create a new check with a randome name. Set expiration date 1 hour in the future.
                                    let checkId = helpers.createRandomString(20);
                                    let check = {
                                        id: checkId,
                                        userPhone,
                                        protocol,
                                        url,
                                        method,
                                        successCodes,
                                        timeoutSeconds
                                    };

                                    // Store the check
                                    _data.create('checks', checkId, check, (err) => {
                                        if (!err) {
                                            // Add the check id to the users object
                                            userData.checks = userChecks;
                                            userData.checks.push(checkId);

                                            // Save the new user data
                                            _data.update('users', userPhone, userData, (err) => {
                                                if (!err) {
                                                    callback(200, check);
                                                } else {
                                                    callback(500, { Error: "Could not update the user with the new check." });
                                                }
                                            })
                                        } else {
                                            callback(500, { Error: "Could not create the new check. " + err });
                                        }
                                    });
                                } else {
                                    callback(400, { Error: 'The hostname of the URL entered did not resolve to any DNS entries' });
                                }
                            });
                        } else {
                            callback(400, { Error: `The user already has the maximun number of checks per user (${config.maxChecks}).` });
                        }
                    } else {
                        callback(403);
                    }
                });
            } else {
                callback(403);
            }
        });
    } else {
        callback(400, { Error: "Required fields are invalid.", RequiredFields: {protocol,url,method,successCodes,timeoutSeconds} });
    }
}

// Checks - get
// Required data: id
handlers._checks.get = (data, callback) => {
    // Validate check id
    let id = typeof data.queryStringObject.id === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;

    if (id) {
        // Lookup the check
        _data.read('checks', id, (err, check) => {
            if (!err && check) {
                // Verify token from headers is valid and belongs to the user
                let tokenId = typeof data.headers.token === 'string' ? data.headers.token : false;
                handlers._tokens.verifyToken(tokenId, check.userPhone, (isValid) => {
                    if (isValid) {
                        callback(200, check);
                    } else {
                        callback(403)
                    }
                });
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, { Error: 'Invalid required field(s).' });
    }
}

// Checks - put
// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds (at least one)
handlers._checks.put = (data, callback) => {
    // Check for the required fields
    let id = typeof data.payload.id === 'string' && data.payload.id.trim().length > 0 ? data.payload.id.trim() : false;

    // Optional fields
    let protocol = typeof data.payload.protocol === 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol.trim() : false;
    let url = typeof data.payload.url === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    let method = typeof data.payload.method === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method.trim() : false;
    let successCodes = data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    let timeoutSeconds = typeof data.payload.timeoutSeconds === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (id) {
        // Verify token from headers is valid
        if (protocol || url || method || successCodes || timeoutSeconds) {
            // Lookup the check
            _data.read('checks', id, (err, checkData) => {
                if (!err && checkData) {
                    let tokenId = typeof data.headers.token === 'string' ? data.headers.token : false;
                    handlers._tokens.verifyToken(tokenId, checkData.userPhone, (isValid) => {
                        if (isValid) {
                            // Update the fields necessary
                            if (protocol) {
                                checkData.protocol = protocol;
                            }
                            if (url) {
                                checkData.url = url;
                            }
                            if (method) {
                                checkData.method = method;
                            }
                            if (successCodes) {
                                checkData.successCodes = successCodes;
                            }
                            if (timeoutSeconds) {
                                checkData.timeoutSeconds = timeoutSeconds;
                            }

                            // Store the updated object
                            _data.update('checks', id, checkData, (err) => {
                                if (!err) {
                                    callback(200);
                                } else {
                                    callback(500, { Error: 'Could not update the check.' });
                                }
                            });
                        } else {
                            callback(403, { Error: "Specified token is not valid." });
                        }
                    });
                } else {
                    callback(400, { Error: 'The specified check id does not exist.' });
                }
            });
        } else {
            callback(400, "Missing fields to update.")
        }
    } else {
        callback(400, "Missing required field.");
    }
}

// checks - delete
// Required data: id
handlers._checks.delete = (data, callback) => {
    // Validate id
    let id = typeof data.queryStringObject.id === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;

    if (id) {
        // Lookup the check
        _data.read('checks', id, (err, checkData) => {
            if (!err && checkData) {
                let tokenId = typeof data.headers.token === 'string' ? data.headers.token : false;
                handlers._tokens.verifyToken(tokenId, checkData.userPhone, (isValid) => {
                    if (isValid) {
                        // Delete the check
                        _data.delete('checks', id, (err) => {
                            if (!err) {
                                _data.read('users', checkData.userPhone, (err, userData) => {
                                    if (!err && userData) {
                                        let userChecks = userData.checks instanceof Array ? userData.checks : [];
                                        let checkPosition = userChecks.indexOf(id);
                                        
                                        if (checkPosition > -1) {
                                            userChecks.splice(checkPosition, 1);
                                            // Re-save the user's data

                                            _data.update('users', checkData.userPhone, userData, (err) => {
                                                if (!err) {
                                                    callback(200);
                                                } else {
                                                    callback(500, { Error: 'Could not update the specified user.' });
                                                }
                                            })
                                        } else {
                                            callback(500, { Error: "Could not find the check n the user's object." })
                                        }
                                    } else {
                                        callback(500, { Error: 'Could not find the user that created the check.' });
                                    }
                                });
                            } else {
                                callback(500, { Error: 'Could not delete the specified check.' });
                            }
                        })
                    } else {
                        callback(403, { Error: "Specified token is not valid." })
                    }
                });
            } else {
                callback(400, { Error: 'Could not find the specified check.' });
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