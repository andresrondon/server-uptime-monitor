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
    envName: 'staging'
};

// Production
environments.production = {
    httpPort: 5000,
    httpsPort: 5001,
    httpsEnabled: true,
    envName: 'production'
};

// Determine which environment was passed as a command-line argument
var currentEnvironment = typeof process.env.NODE_ENV === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Export environment
var environmentToExport = environments[currentEnvironment] || environments.staging;
export let config = environmentToExport;