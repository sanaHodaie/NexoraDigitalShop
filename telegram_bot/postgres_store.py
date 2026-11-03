"""Independent bot schema; no access to storefront account/order tables."""
from contextlib import asynccontextmanager

import psycopg
from psycopg.types.json import Jsonb

SCHEMA_SQL = """
CREATE SCHEMA IF NOT EXISTS nexora_bot;
CREATE TABLE IF NOT EXISTS nexora_bot.user_state (
    bot_id bigint NOT NULL, user_id bigint NOT NULL,
    payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (bot_id, user_id)
);
CREATE TABLE IF NOT EXISTS nexora_bot.processed_updates (
    bot_id bigint NOT NULL, update_id bigint NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (bot_id, update_id)
);
CREATE INDEX IF NOT EXISTS processed_updates_created_at ON nexora_bot.processed_updates(created_at);
CREATE TABLE IF NOT EXISTS nexora_bot.media (
    bot_id bigint NOT NULL, key text NOT NULL, file_id text NOT NULL,
    PRIMARY KEY (bot_id, key)
);
"""


class PostgresStore:
    def __init__(self, url, bot_id):
        self.url, self.bot_id = url, bot_id

    @asynccontextmanager
    async def update(self, uid, update_id):
        async with await psycopg.AsyncConnection.connect(self.url, connect_timeout=10) as connection:
            async with connection.transaction():
                await connection.execute("SET LOCAL statement_timeout = '12000'")
                await connection.execute("SET LOCAL lock_timeout = '4000'")
                # Transaction-scoped lock is compatible with Neon's pooled connection URL.
                await connection.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))',
                                         (f'nexora-bot:{self.bot_id}:{uid}',))
                cursor = await connection.execute('''INSERT INTO nexora_bot.processed_updates(bot_id, update_id)
                    VALUES (%s,%s) ON CONFLICT DO NOTHING RETURNING update_id''', (self.bot_id, update_id))
                if await cursor.fetchone() is None:
                    yield None
                    return
                yield UserTransaction(connection, self.bot_id, uid)


class UserTransaction:
    def __init__(self, connection, bot_id, uid):
        self.connection, self.bot_id, self.uid = connection, bot_id, uid

    async def load(self):
        cursor = await self.connection.execute('''SELECT payload,
            updated_at > now() - interval '24 hours' AS fresh
            FROM nexora_bot.user_state WHERE bot_id=%s AND user_id=%s''', (self.bot_id, self.uid))
        row = await cursor.fetchone()
        if row is None:
            return {}
        if row[1]:
            return row[0]
        # Retain language, expire abandoned product menus and search states.
        return {'version': 1, 'language': row[0].get('language', 'fa')}

    async def save(self, data):
        await self.connection.execute('''INSERT INTO nexora_bot.user_state(bot_id,user_id,payload)
            VALUES (%s,%s,%s) ON CONFLICT (bot_id,user_id) DO UPDATE
            SET payload=excluded.payload, updated_at=now()''', (self.bot_id, self.uid, Jsonb(data)))

    async def get(self, key):
        cursor = await self.connection.execute('SELECT file_id FROM nexora_bot.media WHERE bot_id=%s AND key=%s',
                                               (self.bot_id, key))
        row = await cursor.fetchone()
        return row[0] if row else None

    async def set(self, key, value):
        await self.connection.execute('''INSERT INTO nexora_bot.media(bot_id,key,file_id) VALUES (%s,%s,%s)
            ON CONFLICT (bot_id,key) DO UPDATE SET file_id=excluded.file_id''', (self.bot_id, key, value))

    async def delete(self, key):
        await self.connection.execute('DELETE FROM nexora_bot.media WHERE bot_id=%s AND key=%s', (self.bot_id, key))
