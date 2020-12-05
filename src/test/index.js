/*
* Test runner
*
*/

// Dependencies
import assert from 'assert';

//Application logic for the test runner
var _app = {}

// Container for the tests
_app.tests = {
  unit: {}
};

/* EXAMPLE
/* Simple example of how to write a test

_app.tests.unit['helpers.getANumber() should return 1'] = async (testName) => {
  let result = helpers.getANumber();
  assert.strictEqual(result, 1, testName);
  return { displayTitle: _app.buildSuccessTitle(testName), error: false };
}

*/

_app.getAllTests = function* () {
  for (let key in _app.tests) {
    let subTests = _app.tests[key];
    for (let testName in subTests) {
      let test = subTests[testName];
      yield test(testName).catch(_app.buildErrorOutcome);
    }
  }
}

// Run all the tests, collecting the errors and successes
_app.runTests = async () => {
  const allTests = _app.getAllTests();

  let outcomes = [];
  for await (let outcome of allTests) {
    outcomes.push(outcome);
    console.log(...outcome.displayTitle);
  }

  _app.printTestReport(outcomes)
}

_app.printTestReport = (outcomes) => {
  let passedCount = outcomes.filter(x => !x.error).length;
  let failures = outcomes.filter(x => x.error);

  console.log("");
  console.log("--------BEGIN TEST REPORT--------");
  console.log("");
  console.log("Total Tests: ", outcomes.length);
  console.log("Pass: ", passedCount);
  console.log("Fail: ", failures.length);
  console.log("");

  // If there are errors, print them in detail
  if (failures.length > 0){
    console.log("--------BEGIN ERROR DETAILS--------");
    console.log("");
    for (let outcome of failures) {
      console.log(...outcome.displayTitle);
      console.log(outcome.error);
      console.log("");
    }
    console.log("");
    console.log("--------END ERROR DETAILS--------");
  }


  console.log("");
  console.log("--------END TEST REPORT--------");
}

_app.buildErrorOutcome = (error) => {
  return {
    displayTitle: _app.buildErrorTitle(error.message),
    error
  };
}

_app.buildSuccessTitle = (message) => ['\x1b[32m%s\x1b[0m', message]

_app.buildErrorTitle = (message) => ['\x1b[31m%s\x1b[0m', message]

// Run the tests
_app.runTests();