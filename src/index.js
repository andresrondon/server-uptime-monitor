/*
* Primary file for API
*
*/

// Dependencies
import server from './lib/server.js';
import workers from './lib/workers.js';
import cli from './lib/cli.js';
import cluster from 'cluster';
import os from 'os';

// Declare the app
var app = {};

app.init = (callback) => {
    if (cluster.isMaster) {
        // Start the workers
        workers.init();
        
        // Start the CLI (make sure it starts last)
        setTimeout(() => {
            cli.init();
            typeof callback === 'function' && callback();
        }, 50);

        // Fork the process
        for (let i =  0; i < os.cpus().length; i++) {
            cluster.fork();
        }
    } else {
        // Start the server
        server.init();
    }
};

// Self invoke only if not in testing environment
if (process.env.NODE_ENV !== 'testing') {
    app.init();
}

export default app;