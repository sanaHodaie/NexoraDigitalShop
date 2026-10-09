from sqlalchemy import text


def check_runtime_role(engine):
    """Fail closed before serving production traffic with an administrative login."""
    with engine.connect() as connection:
        privileged = connection.scalar(
            text("""
            SELECT rolsuper OR rolcreaterole OR rolcreatedb OR rolbypassrls
              OR has_schema_privilege(current_user, current_schema(), 'CREATE')
              OR EXISTS (SELECT 1 FROM pg_tables WHERE schemaname=current_schema() AND tableowner=current_user)
            FROM pg_roles WHERE rolname=current_user
        """)
        )
        if privileged:
            raise RuntimeError(
                "Runtime database role must not own tables, create schema objects, or have administrative privileges"
            )
