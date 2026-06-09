'use strict';

/**
 * This file implements a simple in-memory data store for monitors and events.
 *
 * The monitors are implemented as: Map<id, monitorObject>
 * The events are implemented as: Array<eventObject>
 */


const monitors = new Map();
const events   = [];

// Helper functions for monitors

function getMonitor(id) {
  return monitors.get(id) ?? null;
}

function getAllMonitors() {
  return Array.from(monitors.values())
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function setMonitor(monitor) {
  monitors.set(monitor.id, monitor);
}

// Helper functions for events

let eventIdSeq = 0;

function logEvent(monitorId, eventType, details = {}) {
  events.push({
    event_id  : ++eventIdSeq,
    monitor_id: monitorId,
    event_type: eventType,
    details,
    created_at: new Date().toISOString(),
  });
}

function getEvents(monitorId, { limit = 100, eventType = null } = {}) {
  return events
    .filter(e => e.monitor_id === monitorId && (!eventType || e.event_type === eventType))
    .slice(-limit);
}

module.exports = { getMonitor, getAllMonitors, setMonitor, logEvent, getEvents };