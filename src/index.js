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

app.init = (callback) => {
    // Start the server
    server.init();

    // Start the workers
    workers.init();

    // Start the CLI (make sure it starts last)
    setTimeout(() => {
        cli.init();
        typeof callback === 'function' && callback();
    }, 50);
};

// Self invoke only if not in testing environment
if (process.env.NODE_ENV !== 'testing') {
    app.init();
}

export default app;