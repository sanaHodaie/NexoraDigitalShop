"""HTTP surface. Mounted at /api/assistant so the React code is identical whether
the agent runs standalone (tests) or later inside the main backend.

Errors use the backend's contract: {"error": <Persian message>, "code": <CODE>}.
"""

import logging
import time
from collections import defaultdict, deque
from typing import Literal

from fastapi import APIRouter, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from nexora_agent.agent import Agent
from nexora_agent.catalog import make_catalog
from nexora_agent.config import Settings
from nexora_agent.llm import LLMUnavailable, make_llm

log = logging.getLogger("nexora.agent")


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=50)


class ChatResponse(BaseModel):
    reply: str
    actions: list[dict]
    products: list[dict]


class SlidingLimiter:
    """Dev/standalone limiter. In the main backend use its Redis-backed `enforce`."""

    def __init__(self, limit: int, seconds: int = 60):
        self.limit, self.seconds, self.hits = limit, seconds, defaultdict(deque)

    # Same signature as the main backend's limiters: allow(key, limit, seconds).
    def allow(self, key: str, limit: int | None = None, seconds: int | None = None) -> bool:
        limit, seconds = limit or self.limit, seconds or self.seconds
        now, q = time.monotonic(), self.hits[key]
        while q and now - q[0] > seconds:
            q.popleft()
        if len(q) >= limit:
            return False
        q.append(now)
        return True


class DailyCap:
    """Global safety net for the paid LLM key (per process). 0 disables it."""

    def __init__(self, cap: int):
        self.cap, self.day, self.count = cap, "", 0

    def allow(self) -> bool:
        if not self.cap:
            return True
        today = time.strftime("%Y-%m-%d", time.gmtime())
        if today != self.day:
            self.day, self.count = today, 0
        if self.count >= self.cap:
            return False
        self.count += 1
        return True


def error(status: int, message: str, code: str) -> JSONResponse:
    return JSONResponse({"error": message, "code": code}, status_code=status)


def make_router(settings: Settings, get_agent, limiter=None, key_func=None) -> APIRouter:
    """The only thing the main backend needs: app.include_router(make_router(...)).

    `get_agent()` returns an Agent or None (not configured). `limiter` needs
    `allow(key, limit, seconds) -> bool` (the backend's LocalLimiter/RedisLimiter fit).
    `key_func(request) -> str` must return the REAL client id; behind Vercel/Render
    `request.client.host` is the proxy, so pass the backend's own client-IP helper.
    """
    limiter = limiter or SlidingLimiter(settings.rate_limit_per_minute)
    key_func = key_func or (lambda request: request.client.host if request.client else "unknown")
    daily = DailyCap(settings.daily_request_cap)
    router = APIRouter(prefix="/api/assistant", tags=["assistant"])

    @router.post("/chat", response_model=ChatResponse)
    async def chat(data: ChatRequest, request: Request):
        if not limiter.allow("assistant:" + key_func(request), settings.rate_limit_per_minute, 60):
            return error(429, "درخواست‌های زیادی ارسال شده است. کمی بعد تلاش کنید.", "RATE_LIMITED")
        if not daily.allow():
            return error(429, "ظرفیت امروز دستیار تکمیل شده است. فردا دوباره تلاش کنید.", "ASSISTANT_DAILY_LIMIT")
        if data.messages[-1].role != "user" or any(
            len(m.content) > settings.max_message_chars for m in data.messages if m.role == "user"
        ):
            return error(400, "پیام معتبر نیست یا بیش از حد طولانی است.", "VALIDATION_ERROR")
        current = get_agent()
        if current is None:
            return error(503, "دستیار موقتاً در دسترس نیست.", "ASSISTANT_NOT_CONFIGURED")
        try:
            reply = await current.respond([m.model_dump() for m in data.messages])
        except LLMUnavailable:
            log.error("LLM unavailable")
            return error(503, "دستیار موقتاً در دسترس نیست. دوباره تلاش کنید.", "ASSISTANT_UNAVAILABLE")
        return ChatResponse(reply=reply.text, actions=reply.actions, products=reply.products)

    return router


def create_app(settings: Settings | None = None, agent: Agent | None = None) -> FastAPI:
    settings = settings or Settings()
    app = FastAPI(title="Nexora Assistant", version="0.1.0", redoc_url=None)
    app.state.settings, app.state.agent = settings, agent

    if settings.allowed_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.allowed_origins,
            allow_credentials=True,
            allow_methods=["GET", "POST"],
            allow_headers=["Content-Type", "X-CSRF-TOKEN"],
        )

    def get_agent() -> Agent | None:
        if app.state.agent is None:
            llm = make_llm(settings)
            if llm:
                app.state.agent = Agent(llm, make_catalog(settings), settings)
        return app.state.agent

    @app.exception_handler(RequestValidationError)
    async def invalid(request, exc):
        return error(400, "اطلاعات واردشده معتبر نیست.", "VALIDATION_ERROR")

    @app.get("/health")
    def health():
        return {"status": "ok", "llm_configured": get_agent() is not None}

    app.include_router(make_router(settings, get_agent))
    return app


def build() -> FastAPI:  # uvicorn nexora_agent.server:build --factory
    return create_app()
