'use strict';

const store = require('../store');

// This function checks all active monitors to see if any have expired. 
// If a monitor has expired, it updates its status to 'down', logs an alert, and records the event in the store.
function checkExpiredMonitors() {
  const now = Date.now();

  // Iterate through all monitors in the store.
  for (const monitor of store.getAllMonitors()) {
    if (monitor.status !== 'active') continue;
    if (!monitor.expires_at) continue;
    if (new Date(monitor.expires_at).getTime() > now) continue;

    monitor.status = 'down';
    monitor.expires_at = null;
    store.setMonitor(monitor);

    const firedAt = new Date().toISOString();

    console.error('\n [WATCHDOG ALERT]', JSON.stringify({
      ALERT : `Device ${monitor.id} is down!`,
      time : firedAt,
      alert_email: monitor.alert_email,
    }, null, 2));

    store.logEvent(monitor.id, 'alert_fired', {
      alert_email : monitor.alert_email,
      fired_at : firedAt,
    });
  }
}

// Starts the watchdog process that periodically checks for expired monitors. 
// The interval can be configured via the `intervalMs` parameter (defaulting to 5 seconds).
function startWatchdog(intervalMs = 5_000) {
  console.log(`Watchdog armed — polling every ${intervalMs / 1000}s`);
  checkExpiredMonitors();
  return setInterval(checkExpiredMonitors, intervalMs);
}

module.exports = {startWatchdog};