"""Per-admin durable newsletter notification read cursor."""
import sqlalchemy as sa

from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("admin_notification_reads",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("subscriber_id", sa.Integer(), nullable=False))


def downgrade():
    op.drop_table("admin_notification_reads")
