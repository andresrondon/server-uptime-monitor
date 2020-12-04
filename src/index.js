/*
* Primary file for API
*
*/

// Dependencies
import server from './lib/server.js';
import workers from './lib/workers.js';
import cli from './lib/cli.js';

// Declare the app
var app = {};

app.init = () => {
    // Start the server
    server.init();

    // Start the workers
    workers.init();

    // Start the CLI (make sure it starts last)
    setTimeout(cli.init, 50);
};

app.init();

export default app;