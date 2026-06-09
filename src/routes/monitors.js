'use strict';

const express = require('express');
const store   = require('../store');
const router  = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Implementation of POST /monitors features:
router.post('/', (req, res) => {
    const { id, timeout, alert_email } = req.body;
  
    const errors = [];
    if (!id || typeof id !== 'string' || id.trim() === '')
      errors.push('`id` is required and must be a non-empty string.');
    if (!Number.isInteger(timeout) || timeout <= 0)
      errors.push('`timeout` is required and must be a positive integer (seconds).');
    if (!alert_email || !EMAIL_RE.test(alert_email))
      errors.push('`alert_email` is required and must be a valid email address.');
    if (errors.length > 0)
      return res.status(400).json({ error: 'Validation failed.', details: errors });
  
    const cleanId    = id.trim();
    const cleanEmail = alert_email.trim().toLowerCase();
    const existing   = store.getMonitor(cleanId);
    const now        = new Date();
  
    const monitor = {
      id             : cleanId,
      timeout_seconds: timeout,
      alert_email    : cleanEmail,
      status         : 'active',
      expires_at     : new Date(now.getTime() + timeout * 1000).toISOString(),
      created_at     : existing?.created_at ?? now.toISOString(),
    };
  
    store.setMonitor(monitor);
    store.logEvent(cleanId, 'created', { timeout, alert_email: cleanEmail });
  
    return res.status(201).json({
      message: `Monitor '${cleanId}' registered. Watchdog armed.`,
      monitor,
    });
  });
  
  module.exports = router;