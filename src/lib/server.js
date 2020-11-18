/*
* Server-related tasks
*
*/

// @TODO: to refactor file

// Dependencies
import http from 'http';
import https from 'https';
import { parse } from 'url';
import { StringDecoder } from 'string_decoder';
import fs from 'fs';
import config from './config.js';
import handlers from './handlers.js'
import helpers from './helpers.js';
import path from 'path';

// Instantiate the server module
var server = {};

server.unifiedServer = (request, response) => {
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
    let handler = server.router[trimmedPath] || handlers.notFound;

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
server.httpServer = http.createServer(server.unifiedServer);

if (config.httpsEnabled) {
  let rootPath = path.resolve();
  let baseDir = path.join(rootPath, rootPath.substr(rootPath.length - 3, 3) === "src" ? '' : 'src', '/https/');

  // Instantiating the HTTPS server
  server.httpsServerOptions = {
    key: fs.readFileSync(baseDir + '/key.pem'),
    cert: fs.readFileSync(baseDir + '/cert.pem')
  };
  server.httpsServer = https.createServer(server.httpsServerOptions, server.unifiedServer);
}

// Define a request router
server.router = {
  'ping': handlers.ping,
  'users': handlers.users,
  'tokens': handlers.tokens,
  'checks': handlers.checks
}

server.init = () => {
  // Start the HTTP server
  server.httpServer.listen(config.httpPort, () => {
    console.log(`Server listening on port ${config.httpPort} in ${config.envName} mode.`)
  });

  // Start the HTTPS server
  server.httpsServer && server.httpsServer.listen(config.httpsPort, () => {
    console.log(`Server listening on port ${config.httpsPort} in ${config.envName} mode.`)
  });
}

export default server;