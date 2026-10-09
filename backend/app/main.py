import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException

from app.bootstrap import Services
from app.core.config import Settings
from app.core.logging import configure_logging
from app.domain.errors import BusinessError, Conflict
from app.infrastructure.crypto import valid_csrf
from app.infrastructure.database import make_engine
from app.infrastructure.database_security import check_runtime_role
from app.infrastructure.rate_limit import LocalLimiter, RedisLimiter
from app.presentation import account, auth, catalog


def create_app(settings: Settings | None = None, engine=None) -> FastAPI:
    settings = settings or Settings()
    owned_engine = engine is None
    configure_logging()

    @asynccontextmanager
    async def lifespan(app):
        if settings.environment == "production":
            check_runtime_role(app.state.engine)
        yield
        if owned_engine:
            app.state.engine.dispose()

    app = FastAPI(
        title="Nexora API",
        version="2.0.0",
        lifespan=lifespan,
        docs_url=None if settings.environment == "production" else "/docs",
        redoc_url=None,
    )
    app.state.settings = settings
    app.state.engine = engine if engine is not None else make_engine(settings.database_url.get_secret_value())
    app.state.services = Services(settings, app.state.engine)
    app.state.limiter = (
        RedisLimiter(settings.redis_url.get_secret_value()) if settings.redis_url else LocalLimiter()
    )
    if settings.allowed_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.allowed_origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
            allow_headers=["Content-Type", "X-CSRF-TOKEN"],
        )

    @app.middleware("http")
    async def protect_api(request: Request, call_next):
        path = request.url.path.rstrip("/")
        response = None
        if path == "/api" or path.startswith("/api/"):
            if request.method not in {"GET", "HEAD", "OPTIONS"} and not valid_csrf(request):
                response = JSONResponse(
                    {"error": "Invalid CSRF token", "code": "INVALID_CSRF"}, status_code=400
                )
        if response is None:
            try:
                response = await call_next(request)
            except Exception:
                logging.getLogger("nexora").error("Unhandled request failure")
                response = JSONResponse(
                    {"error": "سرویس موقتاً در دسترس نیست. دوباره تلاش کنید.", "code": "INTERNAL_ERROR"},
                    status_code=500,
                )
        if path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
        )
        if settings.environment != "production" and path.startswith("/docs"):
            # Development-only Swagger UI uses an inline initializer. The API and
            # deployed React CSP remain strict and do not inherit this exception.
            response.headers["Content-Security-Policy"] = (
                "default-src 'none'; script-src https://cdn.jsdelivr.net 'unsafe-inline'; "
                "style-src https://cdn.jsdelivr.net 'unsafe-inline'; connect-src 'self'; "
                "img-src https://fastapi.tiangolo.com data:; frame-ancestors 'none'; base-uri 'none'"
            )
        if settings.environment == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    @app.exception_handler(BusinessError)
    async def business_error(request, error):
        headers = {"Retry-After": "60"} if error.status == 429 else None
        return JSONResponse(
            {"error": error.message, "code": error.code}, status_code=error.status, headers=headers
        )

    @app.exception_handler(Conflict)
    async def conflict(request, error):
        return JSONResponse(
            {"error": "Request conflicts with current state", "code": "CONFLICT"}, status_code=409
        )

    @app.exception_handler(HTTPException)
    async def http_error(request, error):
        return JSONResponse(
            {"error": str(error.detail), "code": "HTTP_ERROR"},
            status_code=error.status_code,
            headers=error.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, error):
        return JSONResponse(
            {"error": "اطلاعات واردشده معتبر نیست. فیلدهای فرم را بررسی کنید.", "code": "VALIDATION_ERROR"},
            status_code=400,
        )

    @app.exception_handler(SQLAlchemyError)
    async def database_error(request, error):
        logging.getLogger("nexora").error("Database request failure")
        return JSONResponse(
            {"error": "Service temporarily unavailable", "code": "DATABASE_UNAVAILABLE"}, status_code=503
        )

    @app.get("/health", tags=["health"])
    def health():
        return {"status": "ok"}

    app.include_router(auth.router)
    app.include_router(catalog.router)
    app.include_router(account.router)
    return app


app = create_app()
