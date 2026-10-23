"""Managed storefront content and reversible product archiving."""
import sqlalchemy as sa

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("products", sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False))
    op.create_table("site_documents", sa.Column("key", sa.String(40), primary_key=True),
                    sa.Column("data", sa.JSON(), nullable=False),
                    sa.Column("version", sa.Integer(), nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False))


def downgrade():
    op.drop_table("site_documents")
    op.drop_column("products", "is_active")
