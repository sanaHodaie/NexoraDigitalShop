"""Sessions, verification, permissions, durable emails, audit and expiring orders.

Legacy sessions are revoked, not silently granted a new lifetime. Existing users
remain unverified; existing pending orders receive a bounded reservation window.
"""

import sqlalchemy as sa

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = depends_on = None


def upgrade():
    op.add_column("users", sa.Column("email_verified_at", sa.DateTime(timezone=True)))
    for name in ["created_at", "last_used_at"]:
        op.add_column(
            "auth_sessions",
            sa.Column(name, sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
    op.add_column("auth_sessions", sa.Column("revoked_at", sa.DateTime(timezone=True)))
    op.execute(sa.text("UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP"))
    op.add_column("orders", sa.Column("reservation_expires_at", sa.DateTime(timezone=True)))
    op.add_column("orders", sa.Column("payment_reference", sa.String(160)))
    op.create_index("ix_orders_reservation_expires_at", "orders", ["reservation_expires_at"])
    with op.batch_alter_table("orders") as batch:
        batch.create_unique_constraint("uq_orders_payment_reference", ["payment_reference"])
    # Expire legacy unpaid reservations on the worker's next cycle.
    op.execute(
        sa.text(
            "UPDATE orders SET reservation_expires_at = CURRENT_TIMESTAMP WHERE status = 'pending_payment'"
        )
    )
    op.create_table(
        "action_tokens",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column("purpose", sa.String(32), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("payload", sa.Text()),
    )
    op.create_index("ix_action_tokens_purpose", "action_tokens", ["purpose"])
    op.create_index("ix_action_tokens_user_id", "action_tokens", ["user_id"])
    op.create_table(
        "security_audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event", sa.String(64), nullable=False),
        sa.Column("user_id", sa.Integer()),
        sa.Column("subject_id", sa.String(100)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_security_audit_logs_event", "security_audit_logs", ["event"])
    op.create_index("ix_security_audit_logs_created_at", "security_audit_logs", ["created_at"])
    op.create_table(
        "email_outbox",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("dedupe_key", sa.String(100), unique=True),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("available_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("locked_until", sa.DateTime(timezone=True)),
        sa.Column("lease", sa.String(64)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("failed_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_email_outbox_available_at", "email_outbox", ["available_at"])
    op.create_table("roles", sa.Column("name", sa.String(64), primary_key=True))
    op.create_table(
        "role_permissions",
        sa.Column("role", sa.String(64), sa.ForeignKey("roles.name", ondelete="CASCADE"), primary_key=True),
        sa.Column("permission", sa.String(80), primary_key=True),
    )
    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role", sa.String(64), sa.ForeignKey("roles.name", ondelete="CASCADE"), primary_key=True),
    )
    op.execute(sa.text("INSERT INTO roles (name) VALUES ('manager')"))
    op.execute(
        sa.text(
            "INSERT INTO role_permissions (role, permission) VALUES ('manager', 'orders:read'), ('manager', 'orders:confirm_payment'), ('manager', 'audit:read')"
        )
    )


def downgrade():
    for table in [
        "user_roles",
        "role_permissions",
        "roles",
        "email_outbox",
        "security_audit_logs",
        "action_tokens",
    ]:
        op.drop_table(table)
    op.drop_index("ix_orders_reservation_expires_at", "orders")
    with op.batch_alter_table("orders") as batch:
        batch.drop_constraint("uq_orders_payment_reference", type_="unique")
        batch.drop_column("payment_reference")
        batch.drop_column("reservation_expires_at")
    with op.batch_alter_table("auth_sessions") as batch:
        for name in ["revoked_at", "last_used_at", "created_at"]:
            batch.drop_column(name)
    op.drop_column("users", "email_verified_at")
