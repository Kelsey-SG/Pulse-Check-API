# Pulse-Check API — "Watchdog" Sentinel

> A Dead Man's Switch API for monitoring remote IoT devices at **CritMon Servers Inc.**

---

## The Problem

CritMon monitors remote solar farms and unmanned weather stations in areas with
poor connectivity. Devices send "I'm alive" signals every hour, but there was no
automated way to detect when a device went silent.

**Pulse-Check API** solves this: a device registers a monitor with a countdown
timer. If it fails to send a heartbeat before the timer expires, the Watchdog
automatically fires an alert.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL (`pg`)
- **Background Worker:** Native `setInterval`

---

## Architecture

```mermaid
sequenceDiagram
    participant D  as Remote Device
    participant A  as API (Express)
    participant S  as In-Memory Store
    participant W  as Watchdog Worker

    Note over D,S: Monitor Registration
    D->>A: POST /monitors {"id","timeout","alert_email"}
    A->>S: store.setMonitor(monitor)
    A->>S: store.logEvent(created)
    A-->>D: 201 Created

    Note over D,S: Heartbeat
    D->>A: POST /monitors/:id/heartbeat
    A->>S: store.getMonitor(id)
    S-->>A: {status: "active"}
    A->>S: update expires_at = NOW + timeout
    A->>S: store.logEvent(heartbeat)
    A-->>D: 200 OK
    

    Note over W,S: ③ Alert — Device Goes Silent
    loop Every 5 seconds
        W->>S: getAllMonitors()
        S-->>W: active monitors where expires_at <= NOW
        W->>S: monitor.status = 'down'
        W->>S: store.logEvent(alert_fired)
        W->>W: console.error ALERT JSON
    end
    

    Note over D,S: ④ Pause / Resume
    D->>A: POST /monitors/:id/pause
    A->>S: status=paused, expires_at=null
    A->>S: store.logEvent(paused)
    A-->>D: 200 OK

    D->>A: POST /monitors/:id/heartbeat
    A->>S: status=active, expires_at=NOW+timeout
    A->>S: store.logEvent(unpaused)
    A-->>D: 200 OK
```
---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/monitors` | Register a new monitor |
| `POST` | `/monitors/:id/heartbeat` | Send a heartbeat — resets the timer |
| `POST` | `/monitors/:id/pause` | Pause the monitor (no alerts while paused) |
| `GET` | `/monitors/:id/history` | Full event audit log |