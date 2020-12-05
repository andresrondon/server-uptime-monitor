/*
* API Tests
* 
*/

// Dependencies
import app from './../index.js';
import assert from 'assert';
import http from 'http';
import config from './../lib/config.js';
import _builder from './errorBuilder.js';

// Holder for the tests
var api = {};

var helpers = {};

helpers.makeGetRequest = (path) => new Promise((resolve, reject) => {
  let requestDetails = {
    protocol: 'http:',
    hostname: 'localhost',
    port: config.httpPort,
    method: 'GET',
    path,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  let req = http.request(requestDetails, (res) => {
    resolve(res);
  });

  req.end();
});

api['app.init() should start without throwing'] = (testName) => new Promise (resolve => {
  assert.doesNotThrow(() => {
    app.init(() => {
      resolve(_builder.buildSuccessOutcome(testName));
    });
  }, TypeError, testName);
});

api['/ping should respond to GET with 200'] = async (testName) => {
  const result = await helpers.makeGetRequest('/ping');
  assert.strictEqual(result.statusCode, 200, testName);
  return _builder.buildSuccessOutcome(testName);
}

api['/api/users should respond to GET with 400'] = async (testName) => {
  const result = await helpers.makeGetRequest('/api/users');
  assert.strictEqual(result.statusCode, 400, testName);
  return _builder.buildSuccessOutcome(testName);
}

api['A random path should respond to GET with 404'] = async (testName) => {
  const result = await helpers.makeGetRequest('/this/path/doesnt/exist');
  assert.strictEqual(result.statusCode, 404, testName);
  return _builder.buildSuccessOutcome(testName);
}

export default api;