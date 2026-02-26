---
name: agentstack-payments
description: Creates and manages payments, refunds, balance, and transactions in AgentStack via MCP (payments.*, wallets.*). Use when the user asks about payment, pay, refund, balance, transactions, stripe, tochka, wallet, or accepting money.
---

# AgentStack Payments & Wallets

Enables creating payments, checking status, refunds, and viewing balance and transactions via MCP tools under `payments.*` and `wallets.*`. The ecosystem (project_id=1) acts as the payment gateway; projects and users can have wallets (Stripe, Tochka, AgentPay widget).

## When to use

- User asks for "payment", "pay", "refund", "balance", "transaction", "stripe", "tochka", or "wallet".
- User wants to create a payment, check payment status, or process a refund.
- User needs balance or transaction history for a project or wallet.
- User wants to configure or use the payment acceptance flow (AgentPay widget — see repo docs).

## Why payments matter

- **Ecosystem as gateway:** project_id=1 orchestrates Stripe/Tochka; sensitive keys in protected (8DNA).
- **AgentPay widget:** per-project config in `data.config.payment_widget`; accept payment page and success/fail URLs — see PAYMENTS_DEVELOPER_GUIDE in repo.
- **Wallets:** project and user wallets for real money; use wallets.* for balance and transactions when working with a specific wallet.

## Capabilities (MCP tools)

| Tool | Purpose |
|------|--------|
| `payments.create_payment` | Create a payment (amount, currency, payment_method, description). |
| `payments.get_status` | Get payment status by payment_id. |
| `payments.refund` | Refund a payment (full or partial amount). |
| `payments.list_transactions` | List transactions (limit, offset). |
| `payments.get_balance` | Get balance. |
| `wallets.get_balance` | Get wallet balance (project_id, optional wallet_id). |
| `wallets.list_transactions` | List wallet transactions (project_id, wallet_id, limit). |
| `wallets.create_wallet` | Create wallet (project_id, name, type, currency). |
| `wallets.update_wallet` | Update wallet (wallet_id, wallet_data). |

For full parameters, see **MCP_SERVER_CAPABILITIES** (repo docs). Payment widget config: PATCH project data `config.payment_widget` (see PAYMENT_GATEWAY_ECOSYSTEM, PAYMENTS_DEVELOPER_GUIDE).

## Instructions

1. **Create payment:** Use `payments.create_payment` with amount, currency, payment_method, optional description.
2. **Check status:** Use `payments.get_status` with payment_id.
3. **Refund:** Use `payments.refund` with payment_id; optional amount for partial refund.
4. **Balance / transactions:** Use `payments.get_balance` and `payments.list_transactions` for payment context; use `wallets.get_balance` and `wallets.list_transactions` when working with a specific project wallet.
5. **Widget config:** Payment widget (AgentPay) is configured per project via `data.config.payment_widget`; write via PATCH project data (see repo docs).

## Examples (natural language → tool)

- "Create a 10 USD payment" → `payments.create_payment` with amount 10, currency "USD", payment_method as required.
- "Status of payment X" → `payments.get_status` with payment_id.
- "Refund payment X" → `payments.refund` with payment_id.
- "Balance for project 1025" → `wallets.get_balance` with project_id 1025 (or payments.get_balance as per API).
- "List last 20 transactions" → `payments.list_transactions` or `wallets.list_transactions` with limit 20.

## References

- **MCP_SERVER_CAPABILITIES** — payments.* and wallets.* tools and parameters. See repo docs/MCP_SERVER_CAPABILITIES.md.
- **PAYMENT_GATEWAY_ECOSYSTEM**, **PAYMENTS_DEVELOPER_GUIDE** (repo) — gateway, widget, config.
- **MCP_QUICKSTART.md** (plugin root) — how to get an API key and add MCP in Cursor.
