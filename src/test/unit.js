/*
* Unit Tests
*
*/ 

/*
* EXAMPLE
* Simple example of how to write a test

_app.tests.unit['helpers.getANumber() should return 1'] = async (testName) => {
  let result = helpers.getANumber();
  assert.strictEqual(result, 1, testName);
  return { displayTitle: _app.buildSuccessTitle(testName), error: false };
}

*
*/

// Dependencies
import assert from 'assert';
import _logs from './../lib/logs.js';
import _builder from './errorBuilder.js';

var unit = {};

unit['_logs.list(...) should return an array'] = async (testName) => {
  let result = await _logs.list(true);
  assert.ok(result instanceof Array, testName);
  return _builder.buildSuccessOutcome(testName);
}

unit['_logs.truncate() should not throw if the logId doesnt exist'] = (testName) => new Promise((resolve, reject) => {
  assert.doesNotThrow(() => {
    _logs.truncate('I do not exist', (err) => {
      assert.ok(err, testName);
      resolve(_builder.buildSuccessOutcome(testName))
    });
  }, TypeError, testName);
});

export default unit;