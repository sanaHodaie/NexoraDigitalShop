"""Immutable wholesale PDF, unique tracking code and durable Telegram delivery."""

import sqlalchemy as sa

from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("customer_requests", sa.Column("tracking_code", sa.String(8), nullable=True))
    op.create_index("ix_customer_requests_tracking_code", "customer_requests", ["tracking_code"], unique=True)
    op.add_column("customer_requests", sa.Column("invoice_pdf", sa.LargeBinary(), nullable=True))
    op.add_column("customer_requests", sa.Column("invoice_data", sa.JSON(), nullable=True))
    op.add_column("customer_requests", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        "customer_deliveries",
        sa.Column(
            "request_id",
            sa.Integer(),
            sa.ForeignKey("customer_requests.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("available_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("lease", sa.String(64), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("message_id", sa.BigInteger(), nullable=True),
    )


def downgrade():
    op.drop_table("customer_deliveries")
    for name in ("invoice_pdf", "invoice_data", "approved_at"):
        op.drop_column("customer_requests", name)
    op.drop_index("ix_customer_requests_tracking_code", table_name="customer_requests")
    op.drop_column("customer_requests", "tracking_code")
