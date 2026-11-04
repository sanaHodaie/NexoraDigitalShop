"""Persistent Telegram wholesale/support customer requests."""

import sqlalchemy as sa

from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "customer_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("request_key", sa.String(36), nullable=False, unique=True),
        sa.Column("telegram_user_id", sa.BigInteger(), nullable=False),
        sa.Column("telegram_username", sa.String(64), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("staff_note", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    for column in ("telegram_user_id", "status", "created_at"):
        op.create_index(f"ix_customer_requests_{column}", "customer_requests", [column])


def downgrade():
    op.drop_table("customer_requests")
