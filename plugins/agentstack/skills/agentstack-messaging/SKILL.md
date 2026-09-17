---
name: agentstack-messaging
description: Use for ecosystem Mail Hub — outbound email (Resend/SMTP/Postmark/SES), auth templates (confirm + reset), admin test sends, delivery health, suppressions. Ecosystem owner / platform ops only for admin MCP; tenant app email uses NotificationsService.
---

# AgentStack Messaging (Mail Hub)

**Gene:** `core.messaging.delivery.gen1` · Ops: platform Messaging delivery runbook (monorepo maintainers)

One delivery plane: `NotificationsService.send_notification(channels=["email"])` → `notifications.outbound` worker → provider adapter. **No second mail bus.**

## Decision matrix

| User says | Use |
|-----------|-----|
| "configure Resend / SMTP / Mail Hub" | `messaging.put_config` + `messaging.test_connection` · UI `/dev/platform/admin/ops?tab=notifications` |
| "send test email" | `messaging.send_test_email` |
| "send email to address X" (admin) | `messaging.send_email` with `email` + `message` or `template_name` + `template_data` |
| "confirm email / activation link not working" | `messaging.ensure_auth_templates` → `messaging.get_auth_email_readiness` · template `email_confirmation` (`{{confirm_url}}`) |
| "password reset email" | Template `password_reset` (`{{reset_link}}`) · flows call `send_auth_transactional_email` automatically |
| "email OTP / sign-in code / bot link code" | Template `email_otp` (`{{code}}`, `{{expires_minutes}}`, `{{purpose}}`) · `send_email_otp` · MFA login + bot identity |
| "read Mail Hub config" | `messaging.get_config` (sanitized) |
| "bounce / suppression list" | `messaging.list_suppressions`, `messaging.remove_suppression` |
| "delivery logs / ops health" | `messaging.list_recent_deliveries`, `messaging.get_delivery_health` |
| "tenant app notify user by email" | `NotificationsService.send_notification(channels=["email"])` — not admin MCP |

## MCP quick examples

**Readiness (run before go-live):**

```json
{ "action": "messaging.ensure_auth_templates", "params": {} }
{ "action": "messaging.get_auth_email_readiness", "params": {} }
```

**Send OTP template preview (login / bot link):**

```json
{
  "action": "messaging.send_email",
  "params": {
    "email": "ops@example.com",
    "template_name": "email_otp",
    "template_data": {
      "code": "123456",
      "expires_minutes": "10",
      "purpose": "Enter this code to complete sign-in."
    }
  }
}
```

**Send confirm template preview:**

```json
{
  "action": "messaging.send_email",
  "params": {
    "email": "ops@example.com",
    "template_name": "email_confirmation",
    "template_data": { "confirm_url": "https://agentstack.tech/auth/confirm-email?token=test" }
  }
}
```

**Configure Resend (secrets via Mail Hub — not in repo):**

```json
{
  "action": "messaging.put_config",
  "params": {
    "channels": [{ "type": "email", "enabled": true, "config": { "provider": "resend", "from_address": "noreply@agentstack.tech" } }],
    "resend_api_key": "re_…"
  }
}
```

## Prefer-over

- **DO NOT** use `notifications.send_push` for SMTP/Resend email — Web Push only.
- **DO NOT** add SendGrid SDK or raw provider HTTP in app code — Mail Hub provider registry.
- **DO NOT** skip `messaging.get_auth_email_readiness` when debugging `email_unconfirmed` or missing reset mail.

## Ops CLI

```bash
# Monorepo maintainers: auth email doctor + messaging audit scripts
messaging.ensure_auth_templates
messaging.get_auth_email_readiness
```

## Triggers

mail, email, resend, smtp, postmark, ses, mail hub, confirm email, password reset, activation link, template, bounce, suppression, transactional
