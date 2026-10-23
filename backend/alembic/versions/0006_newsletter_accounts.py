"""Associate newsletter submissions with the authenticated account."""
import sqlalchemy as sa

from alembic import op

revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade():
    constraints = sa.inspect(op.get_bind()).get_unique_constraints('subscribers')
    email_constraint = next(c['name'] for c in constraints if c['column_names'] == ['email'])
    with op.batch_alter_table('subscribers', naming_convention={'uq': 'uq_%(table_name)s_%(column_0_name)s'}) as batch:
        batch.drop_constraint(email_constraint or 'uq_subscribers_email', type_='unique')
        batch.add_column(sa.Column('user_id', sa.Integer(), nullable=True))
        # Historical subscriptions have no reliable creation time or account.
        batch.add_column(sa.Column('created_at', sa.DateTime(timezone=True), nullable=True))
        batch.create_foreign_key('fk_subscribers_user', 'users', ['user_id'], ['id'], ondelete='SET NULL')
        batch.create_unique_constraint('uq_subscribers_user_email', ['user_id', 'email'])


def downgrade():
    # If multiple users submitted the same address, restoring the old unique
    # constraint fails rather than silently deleting any user's submission.
    with op.batch_alter_table('subscribers') as batch:
        batch.drop_constraint('uq_subscribers_user_email', type_='unique')
        batch.drop_constraint('fk_subscribers_user', type_='foreignkey')
        batch.drop_column('created_at')
        batch.drop_column('user_id')
        batch.create_unique_constraint('uq_subscribers_email', ['email'])
