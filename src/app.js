'use strict';

require('dotenv').config();

const express = require('express');
const monitorsRouter = require('./routes/monitors');
const { startWatchdog } = require('./workers/watchdog');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/monitors', monitorsRouter);

app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`); 
    startWatchdog(5_000);
});