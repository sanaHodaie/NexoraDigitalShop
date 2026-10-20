"""Seed versioned assistant controls; preserve existing operator configuration."""

import sqlalchemy as sa

from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    table = sa.table(
        "site_documents",
        sa.column("key", sa.String),
        sa.column("data", sa.JSON),
        sa.column("version", sa.Integer),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    bind = op.get_bind()
    if not bind.scalar(sa.select(table.c.key).where(table.c.key == "assistant")):
        from datetime import datetime, timezone

        bind.execute(
            table.insert().values(
                key="assistant",
                version=1,
                updated_at=datetime.now(timezone.utc),
                data={
                    "enabled": True,
                    "useModel": True,
                    "maxRecommendations": 3,
                    "dailyLimit": 300,
                    "greeting": "سلام! برای انتخاب محصول، کاربرد و بودجه‌ات را بگو.",
                },
            )
        )


def downgrade():
    op.execute(sa.text("DELETE FROM site_documents WHERE key = 'assistant'"))
