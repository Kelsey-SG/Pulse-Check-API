'use strict';

const express = require('express');
const store   = require('../store');
const router  = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Implementation of POST /monitors features:
router.post('/', (req, res) => {
    const {id, timeout, alert_email} = req.body;
  
    const errors = [];
    if (!id || typeof id !== 'string' || id.trim() === '')
      errors.push('`id` is required and must be a non-empty string.');
    if (!Number.isInteger(timeout) || timeout <= 0)
      errors.push('`timeout` is required and must be a positive integer (seconds).');
    if (!alert_email || !EMAIL_RE.test(alert_email))
      errors.push('`alert_email` is required and must be a valid email address.');
    if (errors.length > 0)
      return res.status(400).json({error: 'Validation failed.', details: errors});
  
    const cleanId = id.trim();
    const cleanEmail = alert_email.trim().toLowerCase();
    const existing = store.getMonitor(cleanId);
    const now = new Date();
  
    const monitor = {
      id : cleanId,
      timeout_seconds: timeout,
      alert_email : cleanEmail,
      status : 'active',
      expires_at : new Date(now.getTime() + timeout * 1000).toISOString(),
      created_at : existing?.created_at ?? now.toISOString(),
    };
  
    store.setMonitor(monitor);
    store.logEvent(cleanId, 'created', {timeout, alert_email: cleanEmail});
  
    return res.status(201).json({
      message: `Monitor '${cleanId}' registered. Watchdog armed.`,
      monitor,
    });
  });
  

  // Implementation of POST /monitors/:id/heartbeat features:
router.post('/:id/heartbeat', (req, res) => {
    const {id} = req.params;
    const monitor = store.getMonitor(id);
  
    if (!monitor)
      return res.status(404).json({error: `Monitor '${id}' not found.`});
  
    if (monitor.status === 'down')
      return res.status(409).json({
        error : `Monitor '${id}' is DOWN. Re-register it via POST /monitors to restart.`,
        status : 'down',
      });
  
    const paused = monitor.status === 'paused';
    monitor.status = 'active';
    monitor.expires_at = new Date(Date.now() + monitor.timeout_seconds * 1000).toISOString();
    store.setMonitor(monitor);
    store.logEvent(id, paused ? 'unpaused' : 'heartbeat', { previous_status: monitor.status });
  
    return res.json({
      message: paused ? `Monitor '${id}' un-paused. Timer restarted.` 
      : `Heartbeat received. Timer reset for '${id}'.`, monitor,
    });
  });

  
// Implementation of POST /monitors/:id/pause features:
router.post('/:id/pause', (req, res) => {
    const {id} = req.params;
    const monitor = store.getMonitor(id);
  
    if (!monitor)
      return res.status(404).json({error: `Monitor '${id}' not found.`});
    if (monitor.status === 'paused')
      return res.status(409).json({error: `Monitor '${id}' is already paused.`});
    if (monitor.status === 'down')
      return res.status(409).json({error: `Monitor '${id}' is DOWN. Re-register to restart.`});
  
    monitor.status = 'paused';
    monitor.expires_at = null;
    store.setMonitor(monitor);
    store.logEvent(id, 'paused', { paused_at: new Date().toISOString() });
  
    return res.json({
      message: `Monitor '${id}' paused. No alerts will fire. Send a heartbeat to resume.`,
      monitor,
    });
  });


// Implementation of GET /monitors/:id/history features:
router.get('/:id/history', (req, res) => {
    const {id} = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const eventTypeFilter = req.query.event_type || null;
  
    if (!store.getMonitor(id))
      return res.status(404).json({error: `Monitor '${id}' not found.` });
  
    const history = store.getEvents(id, {limit, eventType: eventTypeFilter});
  
    return res.json({
      monitor_id : id,
      event_count: history.length,
      filters : {limit, event_type: eventTypeFilter ?? 'all'},
      events : history,
    });
  });

  module.exports = router;