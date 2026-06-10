'use strict';

// Load environment variables from .env file (if present).
require('dotenv').config();

const express = require('express');
const monitorsRouter = require('./routes/monitors');
const {startWatchdog} = require('./workers/watchdog');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Mount all monitor-related routes under /monitors.
app.use('/monitors', monitorsRouter);

// Start the server and the watchdog worker.
app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`); 
    startWatchdog(5_000);
});