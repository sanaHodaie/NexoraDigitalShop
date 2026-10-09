-- LOCAL DEMO ONLY. Production credentials must be generated outside this file.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nexora_migrator') THEN
    CREATE ROLE nexora_migrator LOGIN PASSWORD 'local-migration-only' NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nexora_app') THEN
    CREATE ROLE nexora_app LOGIN PASSWORD 'local-app-only' NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END $$;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO nexora_migrator WITH GRANT OPTION;
GRANT USAGE ON SCHEMA public TO nexora_app;
-- Transfer only the earlier local Nexora tables when upgrading an existing volume.
DO $$
DECLARE object record;
BEGIN
  FOR object IN SELECT tablename FROM pg_tables WHERE schemaname='public'
    AND tableowner='nexora' AND tablename IN ('alembic_version','users','auth_sessions',
      'password_resets','products','cart_items','wishlist_items','orders','order_lines',
      'subscribers','action_tokens','security_audit_logs','email_outbox','roles',
      'role_permissions','user_roles')
  LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO nexora_migrator', object.tablename);
  END LOOP;
END $$;
