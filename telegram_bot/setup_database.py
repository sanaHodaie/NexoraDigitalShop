"""Run once with migration credentials; never runs DDL inside a webhook."""
import argparse
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from postgres_store import SCHEMA_SQL
from psycopg import sql


def main():
    load_dotenv(Path(__file__).with_name('.env'))
    parser = argparse.ArgumentParser()
    parser.add_argument('--runtime-role', required=True, help='Existing restricted Neon role used by the bot')
    args = parser.parse_args()
    url = os.getenv('BOT_MIGRATION_DATABASE_URL')
    if not url:
        raise RuntimeError('BOT_MIGRATION_DATABASE_URL is required locally for schema setup')
    with psycopg.connect(url, connect_timeout=10) as connection:
        connection.execute(SCHEMA_SQL)
        role = sql.Identifier(args.runtime_role)
        connection.execute(sql.SQL('GRANT USAGE ON SCHEMA nexora_bot TO {}').format(role))
        connection.execute(sql.SQL('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA nexora_bot TO {}').format(role))
    print('Bot schema and runtime grants are ready. No shop tables were changed.')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'Database setup failed ({type(exc).__name__}); check migration credentials and role name.')
        raise SystemExit(1) from None
