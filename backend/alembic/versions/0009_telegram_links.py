"""Single-use Telegram account linking."""
import sqlalchemy as sa

from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("telegram_links",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("telegram_user_id", sa.BigInteger(), nullable=False, unique=True))
    op.create_table("telegram_link_challenges",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"),
                  nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_telegram_link_challenges_expires_at", "telegram_link_challenges", ["expires_at"])


def downgrade():
    op.drop_table("telegram_link_challenges")
    op.drop_table("telegram_links")
