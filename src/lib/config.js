'use strict'
/*
* Create and export configuration variables
* 
*/

// Container for all the environments
var environments = {};

// Staging (default)
environments.staging = {
    httpPort: 3000,
    httpsPort: 3001,
    httpsEnabled: false,
    envName: 'staging',
    hashingSecret: 'secret-key',
    maxChecks: 5,
    twilio: {
        accountSid : 'ACfce44759a3b0f92e72120f2c8f9c2c30',
        authToken : '66319ad23fdd5ad829a9c55da8c023bb',
        fromPhone : '+15005550006'
    },
    checkIntervalSeconds: 30
};

// Production
environments.production = {
    httpPort: 5000,
    httpsPort: 5001,
    httpsEnabled: true,
    envName: 'production',
    hashingSecret: 'secret-key',
    maxChecks: 5,
    twilio: {
        accountSid : '',
        authToken : '',
        fromPhone : ''
    },
    checkIntervalSeconds: 60
};

// Determine which environment was passed as a command-line argument
var currentEnvironment = typeof process.env.NODE_ENV === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Export environment
export default environments[currentEnvironment] || environments.staging;