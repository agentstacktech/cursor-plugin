/**
 * Shared publication drift + secret scan constants for plugin validators.
 * @see repo.plugins.publication_gates.gen1
 */

// BEGIN codegen STALE_ACTIONS
export const STALE_ACTIONS = new Map([
  ['actions.describe', 'discovery.describe'],
  ['actions.describe_action', 'discovery.describe'],
  ['actions.get_schema', 'discovery.describe'],
  ['actions.list', 'discovery.list'],
  ['actions.schema', 'discovery.describe'],
  ['actions.search', 'discovery.search'],
  ['ai_builder.build.publish', 'ai_builder.publish'],
  ['ai_builder.build.run', 'ai_builder.build.enqueue'],
  ['analytics.export_data', 'analytics.project_snapshot'],
  ['analytics.list', 'analytics.project_snapshot'],
  ['analytics.set_budget', 'analytics.project_snapshot'],
  ['apikeys.revoke', 'apikeys.delete'],
  ['apikeys.rotate', 'user.apikeys.rotate'],
  ['apikeys.update', 'user.apikeys.update'],
  ['assets.mint', 'assets.create'],
  ['auth.assign_role', 'rbac.assign_role'],
  ['auth.create_user', 'auth.register'],
  ['auth.quick_auth', 'auth.login'],
  ['bots.bus.get_message', 'bots.bus.inbox'],
  ['bots.bus.handle.list_handles', 'bots.bus.handle.list'],
  ['bots.bus.handle.register', 'bots.bus.handle.set'],
  ['bots.bus.message.get', 'bots.bus.inbox'],
  ['bots.bus.poll', 'bots.bus.inbox'],
  ['bots.bus.staff_reply', 'bots.staff_reply'],
  ['bots.bus.thread', 'bots.bus.inbox'],
  ['bots.conversations.messages', 'bots.conversations'],
  ['bots.group_access', 'bots.acl.list'],
  ['bots.group_access.get', 'bots.acl.get_mode'],
  ['bots.group_access.list', 'bots.acl.list'],
  ['bots.inbox', 'bots.bus.inbox'],
  ['bots.mailbox.ack', 'bots.bus.ack'],
  ['bots.mailbox.inbox', 'bots.bus.inbox'],
  ['bots.mailbox.poll', 'bots.bus.inbox'],
  ['bots.mailbox.reply', 'bots.staff_reply'],
  ['buffs.revoke', 'buffs.cancel_buff'],
  ['commerce.list_coupons', 'commerce.coupon.list'],
  ['function.compile', 'logic.create'],
  ['function.create', 'logic.create'],
  ['function.list', 'logic.list'],
  ['functions.compile', 'logic.create'],
  ['functions.create', 'logic.create'],
  ['functions.list', 'logic.list'],
  ['generation.current', 'generation.supply_status'],
  ['generation.discard', 'generation.realign_to_prod'],
  ['generation.environments', 'generation.list'],
  ['generation.get', 'generation.env_snapshot'],
  ['generation.get_status', 'generation.status'],
  ['generation.list_environments', 'generation.list'],
  ['generation.list_envs', 'generation.list'],
  ['generation.run_gates', 'generation.gates'],
  ['help', 'discovery.search'],
  ['hosting.bucket.bulk_delete', 'hosting.bucket.files.bulk_delete'],
  ['hosting.bucket.files.delete', 'hosting.bucket.files.bulk_delete'],
  ['hosting.bucket.quota', 'hosting.quota.breakdown'],
  ['hosting.deploy.files', 'hosting.deploy_files'],
  ['hosting.files.bulk_delete', 'hosting.bucket.files.bulk_delete'],
  ['hosting.upgrade', 'hosting.release.promote'],
  ['hosting.workspace.file.list', 'hosting.workspace.files.list'],
  ['integrations.notify', 'notifications.deliver'],
  ['logic.revert', 'logic.restore_version'],
  ['logic.templates_catalog', 'logic.attach_template'],
  ['messaging.reply', 'messaging.inbox.reply'],
  ['messaging.send', 'messaging.send_email'],
  ['meta.describe', 'discovery.describe'],
  ['notifications.send', 'notifications.deliver'],
  ['notifications.send_message', 'notifications.deliver'],
  ['notifications.send_notification', 'notifications.deliver'],
  ['payments.create_payment', 'payments.create'],
  ['payments.get_status', 'payments.get'],
  ['payments.status', 'payments.get'],
  ['projects.attach_to_user', 'projects.add_user'],
  ['projects.create_api_key', 'apikeys.create'],
  ['projects.delete_api_key', 'apikeys.delete'],
  ['projects.get_activity', 'projects.get_stats'],
  ['projects.get_api_keys', 'apikeys.list'],
  ['projects.get_settings', 'projects.get_data'],
  ['projects.update_settings', 'projects.patch_data'],
  ['rbac.list_permissions', 'rbac.get_roles'],
  ['relay.ws_ticket', 'stream.relay.ws_ticket'],
  ['rules.activate_rules', 'logic.update'],
  ['rules.create', 'logic.create'],
  ['rules.create_rules', 'logic.create'],
  ['rules.delete_rules', 'logic.delete'],
  ['rules.list_rules', 'logic.list'],
  ['rules.test_rules', 'logic.dry_run'],
  ['rules.update_rules', 'logic.update'],
  ['scheduler.delete', 'scheduler.cancel_task'],
  ['scheduler.list', 'scheduler.list_tasks'],
  ['scheduler.run_now', 'scheduler.execute_task'],
  ['scheduler.schedule_task', 'scheduler.create_task'],
  ['script.create', 'script.put'],
  ['scripts.create', 'script.put'],
  ['scripts.put', 'script.put'],
  ['stackscript.publish', 'script.publish'],
  ['storage.write', 'storage.upload'],
  ['stream_relay.list_rooms', 'stream.relay.list_rooms'],
  ['stream_relay.rooms.list', 'stream.relay.list_rooms'],
  ['stream_relay.ws_ticket', 'stream.relay.ws_ticket'],
  ['stream.relay.rooms.list', 'stream.relay.list_rooms'],
  ['wallets.create_wallet', 'wallets.create'],
  ['wallets.ensure', 'wallets.create'],
  ['wallets.get_balance', 'payments.get_balance'],
  ['wallets.list_transactions', 'payments.list_transactions'],
  ['wallets.top_up', 'wallets.deposit'],
  ['wallets.update_wallet', 'wallets.create'],
  ['webhooks.create_endpoint', 'integrations.install_recipe'],
  ['webhooks.delete', 'integrations.update_connection'],
  ['webhooks.register', 'integrations.install_recipe'],
  ['webhooks.rotate_secret', 'integrations.rotate_secret'],
  ['ws.ticket', 'stream.relay.ws_ticket'],
]);
// END codegen STALE_ACTIONS

/** True if `oldAction` appears as a whole MCP id (not `user.apikeys.revoke` vs `apikeys.revoke`). */
export function textHasStaleAction(content, oldAction) {
  const id = String(oldAction);
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!id.includes('.')) {
    return new RegExp(`\`${escaped}\``).test(content);
  }
  return new RegExp(`(?<![\\w.])${escaped}(?![\\w.])`).test(content);
}

export const SECRET_PATTERNS = [
  { name: 'AgentStack API key', regex: /\bask_[A-Za-z0-9_-]{16,}\b/g },
  { name: 'JWT bearer token', regex: /\bBearer\s+ey[A-Za-z0-9._-]{30,}\b/g },
  { name: 'OpenAI key', regex: /\bsk-[A-Za-z0-9]{24,}\b/g },
  { name: 'Stripe live key', regex: /\b(?:sk|pk)_live_[A-Za-z0-9]{16,}\b/g },
];

export const SAFE_PLACEHOLDER =
  /\$\{|<[^>\r\n]+>|YOUR_|REPLACE_|example|placeholder|fake/i;

/** Hard-coded marketing action counts (use runtime discovery instead). */
export const HARD_CODED_ACTION_COUNT =
  /\b\d{2,4}\+?\s+(?:catalog\s+)?actions?\b/i;

/** Files allowed to mention scale numbers (monorepo paths + publish-repo relatives). */
export const ACTION_COUNT_ALLOWLIST = new Set([
  'docs/plugins/PUBLISHER_COPY.md',
  'docs/publication/PLATFORM_SCALE.md',
  'docs/plugins/CANONICAL_COPY.md',
  'docs/plugins/CURSOR_PLUGIN_AUDIT_2026-05.md',
  'docs/plugins/CAPABILITY_MATRIX.public.md',
  'docs/plugins/CAPABILITY_MATRIX.md',
  'docs/CAPABILITY_MATRIX.md',
  'provided_plugins/cursor-plugin/VERIFICATION_CHECKLIST.md',
  'provided_plugins/cursor-plugin/plugins/agentstack/commands/agentstack-diagnose.md',
  'provided_plugins/cursor-plugin/plugins/agentstack/commands/agentstack-capability-matrix.md',
  'provided_plugins/cursor-plugin/docs/CAPABILITY_MATRIX.md',
  // Standalone publish repo (paths relative to plugin root)
  'VERIFICATION_CHECKLIST.md',
  'commands/agentstack-diagnose.md',
  'commands/agentstack-capability-matrix.md',
  'plugins/agentstack/commands/agentstack-diagnose.md',
  'plugins/agentstack/commands/agentstack-capability-matrix.md',
]);

/** Skills that must appear in agentstack-backend router table. */
export const ROUTER_SKILLS_REQUIRED = new Set([
  'agentstack-data',
  'agentstack-hosting',
  'agentstack-support',
  'agentstack-storage',
  'agentstack-auth-rbac',
  'agentstack-logic',
  'agentstack-commerce',
  'agentstack-rag',
  'agentstack-signals',
  'agentstack-projects',
  'agentstack-agents-ai',
  'agentstack-messenger',
  'agentstack-integrations',
  'agentstack-discovery',
  'agentstack-commerce-assets',
  'agentstack-capability-tasks',
  'agentstack-sdk',
  'agentstack-crm',
  'agentstack-agentnet',
  'agentstack-storefront-studio',
  'agentstack-project-wallet',
  'agentstack-guidance',
  'agentstack-business',
  'agentstack-services',
  'agentstack-openapi',
  'agentstack-bots',
  'agentstack-knowledge',
  'agentstack-messaging',
  'agentstack-hosted-vertical',
]);

/** Optional grant / specialty skills (not required in router). */
export const ROUTER_SKILLS_OPTIONAL = new Set(['solana']);
