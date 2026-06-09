# 🐕 Pulse-Check API — "Watchdog" Sentinel

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

### Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant D  as 📡 Remote Device
    participant A  as ⚡ API (Express)
    participant DB as 🗄️ PostgreSQL
    participant W  as 🐕 Watchdog Worker

    rect rgb(200, 230, 255)
        Note over D,DB: ① Monitor Registration
        D->>A: POST /monitors {"id","timeout","alert_email"}
        A->>DB: UPSERT monitors (status=active, expires_at=NOW+timeout)
        A->>DB: INSERT monitor_events (type=created)
        A-->>D: 201 Created
    end

    rect rgb(200, 255, 200)
        Note over D,DB: ② Heartbeat — Happy Path
        D->>A: POST /monitors/:id/heartbeat
        A->>DB: SELECT monitor WHERE id=:id
        DB-->>A: {status: "active"}
        A->>DB: UPDATE expires_at = NOW + timeout
        A->>DB: INSERT monitor_events (type=heartbeat)
        A-->>D: 200 OK
    end

    rect rgb(255, 200, 200)
        Note over W,DB: ③ Alert — Device Goes Silent
        loop Every 5 seconds
            W->>DB: UPDATE monitors SET status='down'<br/>WHERE status='active' AND expires_at <= NOW()
            DB-->>W: [{id: "device-123", alert_email: "..."}]
            W->>DB: INSERT monitor_events (type=alert_fired)
            W->>W: console.error 🚨 ALERT JSON
        end
    end

    rect rgb(255, 255, 200)
        Note over D,DB: ④ Pause / Resume
        D->>A: POST /monitors/:id/pause
        A->>DB: UPDATE status=paused, expires_at=NULL
        A->>DB: INSERT monitor_events (type=paused)
        A-->>D: 200 OK

        D->>A: POST /monitors/:id/heartbeat
        A->>DB: UPDATE status=active, expires_at=NOW+timeout
        A->>DB: INSERT monitor_events (type=unpaused)
        A-->>D: 200 OK
    end
```

### State Diagram

```mermaid
stateDiagram-v2
    direction LR

    [*]    --> active : POST /monitors (register)

    active --> active : POST /monitors/:id/heartbeat (timer reset)
    active --> paused : POST /monitors/:id/pause (timer suspended)
    active --> down   : ⏰ Watchdog fires (timer expired)

    paused --> active : POST /monitors/:id/heartbeat (un-pause + reset)

    down   --> active : POST /monitors (re-register)
```

---

## API Endpoints

| Method | Path | User Story | Description |
|--------|------|---|---|
| `POST` | `/monitors` | 1 | Register a new monitor |
| `GET` | `/monitors` | 1 | List all monitors |
| `GET` | `/monitors/:id` | 1 | Get a monitor's current status |
| `POST` | `/monitors/:id/heartbeat` | 2 | Send a heartbeat — reset the timer |
| `POST` | `/monitors/:id/pause` | Bonus | Pause the monitor |
| `GET` | `/monitors/:id/history` | Dev Choice | Full event audit log |