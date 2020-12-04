/*
* CLI-Related Tasks
*
*/

// Dependencies
import readline from 'readline';
import util from 'util';
var debug = util.debuglog('cli');
import events from 'events';
class _events extends events{}
var e = new _events();

var cli = {};

cli.processInput = (str) => {
  str = typeof str === 'string' && str.trim().length > 0 ? str.trim() : false;

  if (str) {
    // Codify the unique strings that identify the unique questions allowed
    let uniqueInputs = [
      'man',
      'help',
      'exit',
      'stats',
      'list users',
      'more user info',
      'list checks',
      'more check info',
      'list logs',
      'more log info'
    ]

    let input = uniqueInputs.find(x => str.includes(x));

    if (input) {
      e.emit(input, str);
    } else {
      console.log(`"${str}" is not a valid input.`);
    }
  }
}

cli.init = () => {
  // Send the start message to the console in dark blue
  console.log('\x1b[34m%s\x1b[0m', `The CLI is running.`);

  // Start the interface
  var _interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '>'
  });

  // Create an initial prompt
  _interface.prompt();

  // Handle each line of input separately
  _interface.on('line', (str) => {
    // Send to the input processor
    cli.processInput(str);

    // Re-initialize the prompt afterwards
    _interface.prompt();
  });

  // If the user stops the CLI, kill the associated process
  _interface.on('close', () => {
    process.exit(0);
  });
}

export default cli;