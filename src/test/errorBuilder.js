var _builder = {};

_builder.buildErrorOutcome = (error) => {
  return {
    displayTitle: _builder.buildErrorTitle(error.message),
    error
  };
}

_builder.buildSuccessOutcome = (testName) => {
  return { 
    displayTitle: _builder.buildSuccessTitle(testName), 
    error: false
  };
}

_builder.buildSuccessTitle = (message) => ['\x1b[32m%s\x1b[0m', message]

_builder.buildErrorTitle = (message) => ['\x1b[31m%s\x1b[0m', message]

export default _builder;