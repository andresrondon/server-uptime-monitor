/*
* CLI-Related Tasks
*
*/

// Dependencies
import readline from 'readline';
import util from 'util';
const debug = util.debuglog('cli');
import events from 'events';
class _events extends events { }
const e = new _events();
import os from 'os';
import v8 from 'v8';
import _data from './data.js';
import _logs from './logs.js';
import helpers from './helpers.js';

const commands = {
  'exit': {
    description: 'Kill the CLI (and the rest of the app)'
  },
  'man': {
    description: 'Show this help page'
  },
  'help': {
    description: 'Alias of the "man" command'
  },
  'stats': {
    description: 'Get statitics on the underlying operating system and resource utilities'
  },
  'list users': {
    description: 'Show a list of all the registered (undeleted) users in the system'
  },
  'more user info': {
    parameters: '--{userId}',
    description: 'Show details of a specific user'
  },
  'list checks': {
    parameters: '--up --down',
    description: 'Show a list of all active checks in the system, including their state. The "--up" and the "--down" flags are both optional'
  },
  'more check info': {
    parameters: '--{checkId}',
    description: 'Show details of a specified check'
  },
  'list logs': {
    description: 'Show a list of all the log files available to be read'
  },
  'more log info': {
    parameters: '--{fileName}',
    description: 'Show details of a specified log file'
  }
};

var cli = {};

cli.setEventHanlders = () => {
  e.on('man', cli.responders.help);
  e.on('help', cli.responders.help);
  e.on('exit', cli.responders.exit);
  e.on('stats', cli.responders.stats);
  e.on('list users', cli.responders.listUsers);
  e.on('more user info', cli.responders.moreUserInfo);
  e.on('list checks', cli.responders.listChecks);
  e.on('more check info', cli.responders.moreCheckInfo);
  e.on('list logs', cli.responders.listLogs);
  e.on('more log info', cli.responders.moreLogInfo);
}

// Responders object
cli.responders = {};

// Help / Man
cli.responders.help = () => {
  printFrame('CLI MANUAL', commands, (key, value) => {
    value.parameters = value.parameters || '';
    let line = '\x1b[33m' + key + ' ' + value.parameters + '\x1b[0m';
    let padding = 60 - line.length;
    line += ' '.repeat(padding);
    line += value.description;
    return line;
  });
}

// Exit
cli.responders.exit = () => {
  process.exit(0);
}

// Stats
cli.responders.stats = () => {
  const heapStatistics = v8.getHeapStatistics()
  const stats = {
    'Load Average': os.loadavg().join(' '),
    'CPU Count': os.cpus().length,
    'Free Memory': os.freemem(),
    'Current Malloced Memory': heapStatistics.malloced_memory,
    'Peak Malloced Memory': heapStatistics.peak_malloced_memory,
    'Allocated Heap Used (%)': Math.round(heapStatistics.used_heap_size / heapStatistics.total_heap_size * 100) + "%",
    'Available Heap Allocated (%)': Math.round(heapStatistics.total_heap_size / heapStatistics.heap_size_limit * 100) + "%",
    'Uptime': os.uptime() + ' Seconds'
  }

  printFrame('SYSTEM STATISTICS', stats, (key, value) => {
    let line = '\x1b[33m' + key + '\x1b[0m';
    let padding = 60 - line.length;
    line += ' '.repeat(padding);
    line += value;
    return line;
  });
}

// List users
cli.responders.listUsers = async () => {
  let userIds = await _data.list('users');
  if (userIds && userIds.length > 0) {
    printFrame('USERS', userIds, async (key, value) => {
      let user = await _data.read('users', value);
      let line = `Name: ${user.firstName} ${user.lastName} Phone: ${user.phone} Checks: ${(user.checks && user.checks.length) || 0}`;
      return line;
    });
  }
}

// More user info
cli.responders.moreUserInfo = async (userId) => {
  userId = (userId && userId.trim()) || false;

  if (userId) {
    // Lookup the user
    let user = await _data.read('users', userId);
    delete user.hashedPassword;

    verticalSpace();
    console.dir(user, { colors: true });
    verticalSpace();
  }
}

// List checks
cli.responders.listChecks = async (state) => {
  let checkIds = await _data.list('checks');
  if (checkIds && checkIds.length > 0) {
    printFrame('CHECKS', checkIds, async (key, value) => {
      let check = await _data.read('checks', value);

      if (state && (check.state || 'down') !== state) return false;

      let line = `ID: ${check.id} ${check.method.toUpperCase()} ${check.protocol}://${check.url} State: ${check.state || 'unknown'}`;
      return line;
    });
  }
}

// More check info
cli.responders.moreCheckInfo = async (checkId) => {
  checkId = (checkId && checkId.trim()) || false;

  if (checkId) {
    // Lookup the check
    let check = await _data.read('checks', checkId);

    verticalSpace();
    console.dir(check, { colors: true });
    verticalSpace();
  }
}

// List logs
cli.responders.listLogs = async () => {
  let logFileNames = await _logs.list(true);

  if (logFileNames && logFileNames.length) {
    // Only filenames that include a dash (-), indicating that is a compressed file
    printFrame('LOGS', logFileNames.filter(l => l.includes('-')), (key, value) => {
      return value;
    });
  }
}

// More Log info
cli.responders.moreLogInfo = async (fileName) => {
  fileName = (fileName && fileName.trim()) || false;

  if (fileName) {
    // Lookup the log
    let data = await _logs.decompress(fileName);

    if (data) {
      verticalSpace();

      for (let jsonString of data.split('\n').filter(x => x !== '{}')) {
        let log = helpers.parse(jsonString);
        console.dir(log, { colors: true });
      }
      
      verticalSpace();
    }
  }
}

// Input processor
cli.processInput = (str) => {
  str = typeof str === 'string' && str.trim().length > 0 ? str.trim() : false;

  if (str) {
    let input = Object.keys(commands).find(x => str.includes(x));

    if (input) {
      let parameters = str.split(' --');
      parameters.shift();
      e.emit(input, ...parameters);
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

  cli.setEventHanlders();
}

export default cli;

async function printFrame(title, items, lineGetter) {
  printHeader(title);

  // Show each item
  for (let key in items) {
    let line = await lineGetter(key, items[key]);
    if (line) {
      console.log(line);
      verticalSpace();
    }
  }

  printFooter();
}

function printFooter() {
  verticalSpace(1);
  horizontalLine();
}

function printHeader(text) {
  horizontalLine();
  centered(text);
  horizontalLine();
  verticalSpace(2);
}

function verticalSpace(lines) {
  lines = (typeof lines === 'number' && lines > 0 && lines) || 1;
  console.log('\n'.repeat(lines - 1));
}

function horizontalLine() {
  // Get the available screen size
  const width = process.stdout.columns;
  let line = '-'.repeat(width);

  console.log(line);
};

function centered(text) {
  text = (typeof text === 'string' && text.trim().length > 0 && text.trim()) || "";
  
  // Get the available screen size
  const width = process.stdout.columns;
  let leftPadding = Math.floor((width - text.length) / 2);

  let line = ' '.repeat(leftPadding) + text;
  console.log(line);
}