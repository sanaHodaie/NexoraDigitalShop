"""Persist invoice recipients, product names and payment timestamps."""

import sqlalchemy as sa

from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("orders", sa.Column("shipping_address", sa.JSON(), nullable=True))
    op.add_column("orders", sa.Column("customer_email", sa.String(254), server_default="", nullable=False))
    op.add_column("orders", sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "orders", sa.Column("rial_rate", sa.Numeric(16, 2), server_default="600000", nullable=False)
    )
    op.add_column("order_lines", sa.Column("product_name", sa.String(300), server_default="", nullable=False))
    op.execute("UPDATE orders SET customer_email = (SELECT email FROM users WHERE users.id = orders.user_id)")
    op.execute(
        "UPDATE order_lines SET product_name = COALESCE((SELECT name FROM products WHERE products.id = order_lines.product_id), product_id)"
    )


def downgrade():
    op.drop_column("order_lines", "product_name")
    for name in ("rial_rate", "paid_at", "customer_email", "shipping_address"):
        op.drop_column("orders", name)
