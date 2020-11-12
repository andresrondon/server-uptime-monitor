/*
* Primary file for API
*
*/

// @TODO: to refactor file

// Dependencies
import http from 'http';
import https from 'https';
import { parse } from 'url';
import { StringDecoder } from 'string_decoder';
import fs from 'fs';
import config from './lib/config.js';
import handlers from './lib/handlers.js'
import helpers from './lib/helpers.js';

var unifiedServer = (request, response) => {
    // Get the URL and parse it
    let parsedUrl = parse(request.url, true);

    // Get the path
    let path = parsedUrl.pathname;
    let trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the query string as an object
    let queryStringObject = parsedUrl.query;

    // Get the HTTP method
    let method = request.method.toLowerCase();

    // Get the headers as an object
    let headers = request.headers;

    // Get the payload, if any
    var decoder = new StringDecoder('utf-8');
    var buffer = '';
    request.on('data', data => buffer += decoder.write(data));
    request.on('end', () => {
        buffer += decoder.end();

        // Choose the handler this request should go to. If none, use notFound handler
        let handler = router[trimmedPath] || handlers.notFound;

        // Construct the data object to send to the handler
        let data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: helpers.parse(buffer)
        }

        // Route the request to the handler specified in the router
        handler(data, (statusCode, payload) => {
            statusCode = typeof statusCode == 'number' ? statusCode : 200;
            payload = typeof payload == 'object' ? payload : {};

            let payloadString = JSON.stringify(payload);

            // Return the response
            response.setHeader('Content-Type', 'application/json');
            response.writeHead(statusCode);
            response.end(payloadString);

            // Log the request path
            console.log(`Returning this response: `, statusCode, payloadString);
        });
    });
}

// Instantiating the HTTP server
var httpServer = http.createServer(unifiedServer);

// Start the HTTP server
httpServer.listen(config.httpPort, () => {
    console.log(`Server listening on port ${config.httpPort} in ${config.envName} mode.`)
})

if (config.httpsEnabled) {
    // Instantiating the HTTPS server
    var httpsServerOptions = {
        key: fs.readFileSync('./https/key.pem'),
        cert: fs.readFileSync('./htpps/cert.pem')
    };
    var httpsServer = https.createServer(httpsServerOptions, unifiedServer);

    // Start the HTTPS server
    httpsServer.listen(config.httpsPort, () => {
        console.log(`Server listening on port ${config.httpsPort} in ${config.envName} mode.`)
    })
}

// Define a request router
const router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens
}