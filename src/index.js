/*
* Primary file for API
*
*/

// Dependencies
import server from './lib/server.js'
import workers from './lib/workers.js'

// Declare the app
var app = {};

app.init = () => {
    // Start the server
    server.init();

    // Start the workers
    workers.init();
};

app.init();

export default app;