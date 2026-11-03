"""Synchronous webhook completion: no detached tasks lost on serverless shutdown."""
import asyncio
import logging
import os
import re
import secrets
from contextlib import asynccontextmanager
from urllib.parse import parse_qs, urlsplit

from aiogram import Bot, Dispatcher
from aiogram.client.session.middlewares.base import BaseRequestMiddleware
from aiogram.exceptions import TelegramBadRequest
from aiogram.methods import AnswerCallbackQuery
from aiogram.types import Update
from api_client import NexoraClient
from config import load_config
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from handlers import NexoraHandlers
from main import SecretFormatter
from postgres_store import PostgresStore
from pydantic import ValidationError
from state_codec import UserLanguageStore, restore, snapshot
from transport import telegram_session


class ExpiredCallbackAck(BaseRequestMiddleware):
    async def __call__(self, make_request, bot, method):
        try:
            return await make_request(bot, method)
        except TelegramBadRequest as exc:
            # A free host may wake after Telegram's callback toast deadline.
            # Its expired acknowledgement must not permanently block the update queue.
            if isinstance(method, AnswerCallbackQuery) and any(
                term in exc.message.lower() for term in ('query is too old', 'query id is invalid')
            ):
                return True
            raise


class Runtime:
    def __init__(self):
        self.cfg = load_config()
        self.database_url = os.getenv('BOT_DATABASE_URL', '')
        if not self.database_url:
            raise RuntimeError('BOT_DATABASE_URL is required')
        for url in [self.cfg.api_base_url, self.cfg.frontend_url]:
            parsed = urlsplit(url)
            if parsed.scheme != 'https' or not parsed.hostname:
                raise RuntimeError('Webhook backend/frontend origins must use HTTPS')
        parsed_db = urlsplit(self.database_url)
        if parse_qs(parsed_db.query).get('sslmode', [''])[0] not in ('require', 'verify-ca', 'verify-full'):
            raise RuntimeError('BOT_DATABASE_URL must enable PostgreSQL TLS')
        if parsed_db.scheme not in ('postgres', 'postgresql'):
            raise RuntimeError('Use a standard PostgreSQL connection URL for BOT_DATABASE_URL')
        if self.cfg.proxy_url:
            raise RuntimeError('Remove the local PROXY_URL before deploying the webhook')
        if not logging.getLogger().handlers:
            logging.basicConfig(level=logging.INFO)
        for handler in logging.getLogger().handlers:
            handler.setFormatter(SecretFormatter(self.cfg.bot_token, self.cfg.telegram_bot_api_key, self.database_url))
        logging.getLogger('httpx').setLevel(logging.WARNING)
        logging.getLogger('aiogram.event').setLevel(logging.WARNING)
        self.bot = Bot(self.cfg.bot_token, session=telegram_session())
        self.bot.session.middleware(ExpiredCallbackAck())
        self.client = NexoraClient(self.cfg.api_base_url, products_path=self.cfg.products_path,
                                  product_detail_path=self.cfg.product_detail_path,
                                  telegram_bot_api_key=self.cfg.telegram_bot_api_key)
        self.store = PostgresStore(self.database_url, self.bot.id)

    async def close(self):
        await self.client.aclose()
        await self.bot.session.close()

    async def process(self, update):
        event = update.message or update.callback_query
        if event is None or event.from_user is None:
            return
        chat = update.message.chat if update.message else getattr(update.callback_query.message, 'chat', None)
        if chat is None or chat.type != 'private':
            return
        uid = event.from_user.id
        async with self.store.update(uid, update.update_id) as transaction:
            if transaction is None:
                return
            saved = await transaction.load()
            language = UserLanguageStore(saved.get('language', 'fa'))
            handler = NexoraHandlers(self.cfg, self.client, language, media_cache=transaction)
            restore(handler, uid, saved)
            dispatcher = Dispatcher()
            dispatcher.include_router(handler.router)
            context = dispatcher.fsm.get_context(bot=self.bot, chat_id=chat.id, user_id=uid)
            try:
                await context.set_state(saved.get('fsm_state'))
                await context.set_data(saved.get('fsm_data', {}))
                # Await all Telegram effects before returning 200 to the webhook.
                await dispatcher.feed_update(self.bot, update)
                await transaction.save(snapshot(handler, uid, language.language,
                                                await context.get_state(), await context.get_data()))
            finally:
                await dispatcher.storage.close()


def create_app(runtime_factory=Runtime):
    runtime = None
    lock = asyncio.Lock()

    @asynccontextmanager
    async def lifespan(app):
        yield
        if runtime is not None:
            await runtime.close()

    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)

    @app.get('/health')
    async def health():
        return {'status': 'ok', 'mode': 'webhook'}

    @app.post('/api/telegram')
    async def telegram(request: Request):
        nonlocal runtime
        expected = os.getenv('WEBHOOK_SECRET', '')
        if not re.fullmatch(r'[A-Za-z0-9_-]{32,256}', expected):
            return JSONResponse({'error': 'Webhook is not configured'}, status_code=503)
        supplied = request.headers.get('X-Telegram-Bot-Api-Secret-Token', '')
        if not secrets.compare_digest(supplied.encode(), expected.encode()):
            return JSONResponse({'error': 'Unauthorized'}, status_code=401)
        # Bound unauthenticated/malformed input; secrets/requests are never logged.
        body = bytearray()
        async for chunk in request.stream():
            if len(body) + len(chunk) > 1024 * 1024:
                return JSONResponse({'error': 'Payload too large'}, status_code=413)
            body.extend(chunk)
        try:
            update = Update.model_validate_json(body)
        except (ValidationError, ValueError):
            return JSONResponse({'error': 'Invalid update'}, status_code=400)
        try:
            if runtime is None:
                async with lock:
                    if runtime is None:
                        runtime = runtime_factory()
            # Keep this below the deployment's maxDuration. A failed transaction is retried by Telegram.
            async with asyncio.timeout(50):
                await runtime.process(update)
        except Exception as exc:
            logging.getLogger('nexora.bot').warning('Webhook processing failed (%s)', type(exc).__name__)
            return JSONResponse({'error': 'Please retry'}, status_code=503, headers={'Retry-After': '5'})
        return {'ok': True}

    return app


app = create_app()
