/*
* Worker-related tasks
*
*/

import path from 'path';
import fs from 'fs';
import _data from './data.js';
import https from 'https';
import http from 'http';
import helpers from './helpers.js';
import url from 'url';
import config from './config.js';

var workers = {};

// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = () => {
  _data.list('checks', (err, checks) => {
    if (!err && checks && checks.length) {
      for (let checkId of checks) {
        _data.read('checks', checkId, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            // @TODO: Refactor this to follow CQRS pattern
            // Pass the data to the check validator
            workers.validateCheckData(originalCheckData);
          } else {
            console.log("Error reading one of the check's data.");
          }
        });
      }
    } else {
      console.log({ Error: "Could not find any checks to proccess." });
    }
  })
}

// Sanity-check for check data
workers.validateCheckData = (check) => {
  check = typeof check == 'object' ? check : {};
  check.id = typeof check.id == 'string' && check.id.trim().length == 20 ? check.id.trim() : false;
  check.userPhone = typeof check.userPhone == 'string' && check.userPhone.trim().length == 10 ? check.userPhone.trim() : false;
  check.protocol = typeof check.protocol == 'string' && ['http', 'https'].indexOf(check.protocol) > -1 ? check.protocol : false;
  check.url = typeof check.url == 'string' && check.url.trim().length > 0 ? check.url.trim() : false;
  check.method = typeof check.method == 'string' && ['get', 'post', 'put', 'delete'].indexOf(check.method) > -1 ? check.method : false;
  check.successCodes = check.successCodes instanceof Array && check.successCodes.length > 0 ? check.successCodes : false;
  check.timeoutSeconds = typeof check.timeoutSeconds == 'number' && check.timeoutSeconds % 1 === 0 && check.timeoutSeconds >= 1 && check.timeoutSeconds <= 5 ? check.timeoutSeconds : false;

  // Set the keys that may not be set
  check.state = typeof check.state == 'string' && ['up', 'down'].indexOf(check.state) > -1 ? check.state : 'down';
  check.lastChecked = typeof check.lastChecked == 'number' && check.lastChecked > 0 ? check.lastChecked : false;

  // @TODO: Refactor this to follow CQRS pattern
  // If all the checks pass, pass the data along to the next step in the proccess
  if (check.id &&
    check.userPhone &&
    check.protocol &&
    check.url &&
    check.method &&
    check.successCodes &&
    check.timeoutSeconds) {
    workers.performCheck(check);
  } else {
    console.log({ Error: "One of the checks is not properly formatted. Skipping it." }, check);
  }
}

// Perform the check
workers.performCheck = (check) => {
  // Prepare the initial check outcome
  let checkOutcome = {
    error: false,
    responseCode: false
  };

  let outcomeSent = false;

  // Parse the hostname and the path out of the check data
  let parsedUrl = url.parse(check.protocol + "://" + check.url, true);

  // Construct the request
  let requestDetails = {
    protocol: check.protocol + ":",
    hostName: parsedUrl.hostname,
    port: parsedUrl.port,
    method: check.method.toUpperCase(),
    path: parsedUrl.path,
    timeout: check.timeoutSeconds * 1000
  }

  // Instantiate the request object using either the http or https module
  let _moduleToUse = check.protocol === 'http' ? http : https;
  let request = _moduleToUse.request(requestDetails, (response) => {
    checkOutcome.responseCode = response.statusCode;
    if (!outcomeSent) {
      workers.processCheckOutcome(check, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the error event so it doesn't get thrown
  request.on('error', (err) => {
    checkOutcome.error = {
      error: true,
      value: err
    }

    if (!outcomeSent) {
      workers.processCheckOutcome(check, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the timeout event so it doesn't get thrown
  request.on('timeout', (err) => {
    checkOutcome.error = {
      timeout: true,
      value: 'timeout'
    }

    if (!outcomeSent) {
      workers.processCheckOutcome(check, checkOutcome);
      outcomeSent = true;
    }
  });

  request.end();
}

// Process the checks outcome, update the check data as needed, trigger an alert if any
// Sepecial logic for accomodating a check that has never been teste befor
workers.processCheckOutcome = (check, checkOutcome) => {
  let state = !checkOutcome.error && checkOutcome.responseCode && check.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';
  let alertWarranted = check.lastChecked && check.state !== state;
  // Update the check data
  check.state = state;
  check.lastChecked = Date.now();
  _data.update('checks', check.id, check, (err) => {
    if (!err) {
      if (alertWarranted) {
        workers.alertUserToStatusChange(check);
      } else {
        console.log({ Alert: "Check outcome has not changed, no alert needed."});
      }
    } else {
      console.log({ Error: "Error trying to save updates to check id " + check.id });
    }
  });
}

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = (check) => {
  let message = `Alert: Your check for ${check.method.toUpperCase()} ${check.protocol}://${check.url} is currently ${check.state}.`;

  helpers.sendTwilioSms(check.userPhone, message, (err) => {
    if (!err) {
      console.log("Success: User was alerted to a status change in their check, via sms.", message);
    } else {
      console.log("Error: Could not send sms to user.");
    }
  });
}

// Timer to execute the worker-process once per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * config.checkIntervalSeconds);
}

workers.init = () => {
  // Execute all the checks inmediately
  workers.gatherAllChecks();

  // Call the loop so the checks will execute later on
  workers.loop();
}

export default workers;