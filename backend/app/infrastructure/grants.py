"""Deployment-only grants, executed with the migration owner credential."""

from sqlalchemy import text


def grant_runtime(engine, role):
    with engine.begin() as connection:
        quote = connection.dialect.identifier_preparer.quote
        role = quote(role)
        schema = quote(connection.scalar(text("SELECT current_schema()")))
        connection.execute(text(f"GRANT USAGE ON SCHEMA {schema} TO {role}"))
        connection.execute(text(f"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA {schema} TO {role}"))
        connection.execute(text(f"REVOKE ALL ON ALL TABLES IN SCHEMA {schema} FROM {role}"))
        groups = [
            ("SELECT, INSERT, UPDATE", ["users", "auth_sessions", "orders", "order_lines", "subscribers"]),
            (
                "SELECT, INSERT, UPDATE, DELETE",
                ["cart_items", "wishlist_items", "password_resets", "action_tokens", "email_outbox"],
            ),
            ("SELECT", ["products", "roles", "role_permissions", "user_roles"]),
            ("UPDATE (stock)", ["products"]),
            ("SELECT, INSERT", ["security_audit_logs"]),
        ]
        for permissions, tables in groups:
            names = ", ".join(f"{schema}.{quote(table)}" for table in tables)
            connection.execute(text(f"GRANT {permissions} ON {names} TO {role}"))
