---
name: agentstack-notify-setup
description: Unified Channel Plane — enroll sources, category prefs, deliver with fallback, Logic triggers.
---

# /agentstack-notify-setup

**Gene:** `core.messaging.channel_plane.gen1` · MCP prompt: `agentstack_channel_setup` · recipe `mcp_notify_channels_v1`  
**UI:** Profile → Notifications (`/user/profile?tab=notifications`) · deep links `?focus=sources|matrix|quiet|enroll|history`

## 1. Session + read (no send)

```json
{"action": "auth.get_profile", "params": {}}
{"action": "notifications.list_prefs", "params": {}}
{"action": "channels.list_identities", "params": {}}
```

## 2. Enroll delivery source

User must `/login` in bot first (Profile → Security → linked chats). Then:

```json
{"action": "channels.enroll_source", "params": {
  "source": {"kind": "bot", "channel": "telegram", "bot_uuid": "<uuid>", "enabled": true}
}}
```

Email / web_push use the same `channels.enroll_source` with `kind: "email"` or `kind: "web_push"`.

## 3. Category matrix + quiet hours

```json
{"action": "notifications.update_prefs", "params": {
  "categories": {
    "security": {"channels": ["email", "telegram", "in_app"]},
    "social": {"channels": ["in_app"], "muted": false}
  },
  "quiet_hours": {"start": "22:00", "end": "08:00", "tz": "UTC"},
  "digest_mode": "hourly"
}}
```

## 4. Deliver (explicit channel or fallback chain)

```json
{"action": "notifications.deliver", "params": {
  "user_id": "<target>",
  "category": "security",
  "title": "Test",
  "body": "Reachability check",
  "correlation_key": "ops:notify-setup:{{timestamp}}"
}}
```

Security/auth/billing categories use guaranteed fallback (`notifications.send_with_fallback`).

## 5. Diagnostics

```json
{"action": "notifications.delivery_status", "params": {}}
{"action": "channels.list_failed_deliveries", "params": {"limit": 10}}
{"action": "channels.list_event_triggers", "params": {}}
```

## 6. Logic automation (optional)

Subscribe to catalog kinds from `channels.list_event_triggers` via `logic.create` + `neural_event` trigger.

Verify with `/agentstack-diagnose`.
