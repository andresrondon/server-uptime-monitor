/*
* Test runner
*
*/

// Dependencies
import _builder from './errorBuilder.js';
import _unitTests from './unit.js';
import _apiTests from './api.js';

// Application logic for the test runner
var _app = {}

// Container for the tests
_app.tests = {};

_app.tests.unit = _unitTests;
_app.tests.api = _apiTests;

_app.getAllTests = function* () {
  for (let key in _app.tests) {
    let subTests = _app.tests[key];
    for (let testName in subTests) {
      let test = subTests[testName];
      yield test(testName).catch(_builder.buildErrorOutcome);
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

  process.exit(0);
}

// Run the tests
_app.runTests();