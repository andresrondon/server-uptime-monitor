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
import util from 'util';
let debug = util.debuglog('server');

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

    // If the request is within the public directory, use the public handler
    handler = trimmedPath.includes('public/') ? handlers.public : handler;

    // Construct the data object to send to the handler
    let data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parse(buffer)
    }

    // Route the request to the handler specified in the router
    handler(data, (statusCode, payload, contentType) => {
      contentType = typeof contentType == 'string' ? contentType : 'json';
      statusCode = typeof statusCode == 'number' ? statusCode : 200;
      // Return the response parts that are content-specific
      let payloadString = '';
      switch (contentType) {
        case 'json':
          response.setHeader('Content-Type', 'application/json');
          payload = typeof payload == 'object' ? payload : {};
          payloadString = JSON.stringify(payload);
          break;
        case 'html':
          response.setHeader('Content-Type', 'text/html');
          payloadString = typeof payload == 'string' ? payload : '';
          break;
        case 'javascript':
          response.setHeader('Content-Type', 'text/javascript');
          payloadString = typeof payload !== 'undefined' ? payload : '';
          break;
        case 'css':
          response.setHeader('Content-Type', 'text/css');
          payloadString = typeof payload !== 'undefined' ? payload : '';
          break;
        case 'png':
          response.setHeader('Content-Type', 'image/png');
          payloadString = typeof payload !== 'undefined' ? payload : '';
          break;
        case 'jpg':
          response.setHeader('Content-Type', 'image/jpeg');
          payloadString = typeof payload !== 'undefined' ? payload : '';
          break;
        case 'favicon':
          response.setHeader('Content-Type', 'image/x-icon');
          payloadString = typeof payload !== 'undefined' ? payload : '';
          break;
        default:
          response.setHeader('Content-Type', 'text/plain');
          payloadString = typeof payload !== 'undefined' ? payload : '';
          break;
      }

      // Return the response parts that are common to all conten-types
      response.writeHead(statusCode);
      response.end(payloadString);

      // Log the request path
      if (statusCode == 200 || statusCode == 201) {
        // log in green
        debug('\x1b[32m%s\x1b[0m', `Returning this response: `, statusCode);
      } else {
        // log in red
        debug('\x1b[31m%s\x1b[0m', `Returning this response: `, statusCode, payloadString);
      }
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
  '': handlers.index,
  'account/create': handlers.accountCreate,
  'account/edit': handlers.accountEdit,
  'account/deleted': handlers.accountDeleted,
  'session/create': handlers.sessionCreate,
  'session/deleted': handlers.sessionDeleted,
  'checks/all': handlers.checksList,
  'checks/create': handlers.checksCreate,
  'checks/edit': handlers.checksEdit,
  'ping': handlers.ping,
  'api/users': handlers.users,
  'api/tokens': handlers.tokens,
  'api/checks': handlers.checks,
  'favicon.ico': handlers.favicon,
  'public': handlers.public
}

server.init = () => {
  // Start the HTTP server
  server.httpServer.listen(config.httpPort, () => {
    console.log('\x1b[33m%s\x1b[0m', `Server listening on port ${config.httpPort} in ${config.envName} mode.`)
  });

  // Start the HTTPS server
  server.httpsServer && server.httpsServer.listen(config.httpsPort, () => {
    console.log('\x1b[33m%s\x1b[0m', `Server listening on port ${config.httpsPort} in ${config.envName} mode.`)
  });
}

export default server;