-- After migrations, run as the migration owner:
-- psql MIGRATION_DATABASE_URL -v app_role=nexora_app -f scripts/grants.sql
\set ON_ERROR_STOP on
GRANT USAGE ON SCHEMA public TO :"app_role";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_role";
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM :"app_role";
GRANT SELECT, INSERT, UPDATE ON users, auth_sessions, orders, order_lines, subscribers TO :"app_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON cart_items, wishlist_items, password_resets, action_tokens, email_outbox TO :"app_role";
GRANT SELECT ON products, roles, role_permissions, user_roles TO :"app_role";
GRANT UPDATE (stock) ON products TO :"app_role";
GRANT SELECT, INSERT ON security_audit_logs TO :"app_role";
