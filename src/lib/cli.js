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

// Input handlers
e.on('man', (str) => {
  cli.responders.help();
});

e.on('help', (str) => {
  cli.responders.help();
});

e.on('exit', (str) => {
  cli.responders.exit();
});

e.on('stats', (str) => {
  cli.responders.stats();
});

e.on('list users', (str) => {
  cli.responders.listUsers();
});

e.on('more user info', (str) => {
  cli.responders.moreUserInfo(str);
});

e.on('list checks', (str) => {
  cli.responders.listChecks(str);
});

e.on('more check info', (str) => {
  cli.responders.moreCheckInfo(str);
});

e.on('list logs', (str) => {
  cli.responders.listLogs();
});

e.on('more log info', (str) => {
  cli.responders.moreLogInfo(str);
});

// Responders object
cli.responders = {};

// Help / Man
cli.responders.help = () => {
  console.log("You asked for help")
}

// Exit
cli.responders.help = () => {
  console.log("You asked for exit")
}

// Stats
cli.responders.stats = () => {
  console.log("You asked for help")
}

// List users
cli.responders.listUsers = () => {
  console.log("You asked for exit")
}

// More user info
cli.responders.moreUserInfo = (str) => {
  console.log("You asked for exit")
}

// List checks
cli.responders.listChecks = (str) => {
  console.log("You asked for exit")
}

// More check info
cli.responders.moreUserInfo = (str) => {
  console.log("You asked for exit")
}

// List logs
cli.responders.listLogs = () => {
  console.log("You asked for exit")
}

// More Log info
cli.responders.moreLogInfo = (str) => {
  console.log("You asked for exit")
}


// Input processor
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