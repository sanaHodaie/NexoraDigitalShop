"""Durable uploaded product photos and precision for rial price entry."""
import sqlalchemy as sa

from alembic import op

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('product_media', sa.Column('key', sa.String(64), primary_key=True),
                    sa.Column('content', sa.LargeBinary(), nullable=False))
    for table, column in [('products', 'price'), ('orders', 'total'), ('order_lines', 'unit_price')]:
        with op.batch_alter_table(table) as batch:
            batch.alter_column(column, existing_type=sa.Numeric(18, 2), type_=sa.Numeric(30, 12), existing_nullable=False)


def downgrade():
    # Explicit downgrade rounds newly entered prices; take a backup first.
    for table, column in [('order_lines', 'unit_price'), ('orders', 'total'), ('products', 'price')]:
        with op.batch_alter_table(table) as batch:
            batch.alter_column(column, existing_type=sa.Numeric(30, 12), type_=sa.Numeric(18, 2), existing_nullable=False)
    op.drop_table('product_media')
