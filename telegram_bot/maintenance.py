"""Optional weekly cleanup of old receipts and abandoned navigation snapshots."""
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv


def main():
    load_dotenv(Path(__file__).with_name('.env'))
    with psycopg.connect(os.environ['BOT_DATABASE_URL'], connect_timeout=10) as connection:
        receipts = connection.execute("DELETE FROM nexora_bot.processed_updates WHERE created_at < now() - interval '7 days'")
        navigation = connection.execute("""UPDATE nexora_bot.user_state
            SET payload=jsonb_build_object('version',1,'language',COALESCE(payload->>'language','fa'))
            WHERE updated_at < now() - interval '24 hours' AND payload ? 'navigation'""")
    print('Old update receipts removed:', receipts.rowcount)
    print('Expired navigation snapshots reduced:', navigation.rowcount)


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'Maintenance failed ({type(exc).__name__}).')
        raise SystemExit(1) from None
