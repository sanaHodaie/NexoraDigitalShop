from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException

from app.config import Settings
from app.db import make_engine
from app.routers import account, auth, catalog
from app.security import RateLimiter, valid_csrf


def create_app(settings: Settings | None = None, engine=None) -> FastAPI:
    settings = settings or Settings()
    owned_engine = engine is None

    @asynccontextmanager
    async def lifespan(app):
        yield
        if owned_engine:
            app.state.engine.dispose()

    app = FastAPI(title="Nexora API", version="1.0.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.engine = engine if engine is not None else make_engine(settings.database_url.get_secret_value())
    app.state.limiter = RateLimiter()

    @app.middleware("http")
    async def protect_api(request: Request, call_next):
        path = request.url.path.rstrip("/")
        if path == "/api" or path.startswith("/api/"):
            group = (
                "auth"
                if path
                in {
                    "/api/auth/register",
                    "/api/auth/login",
                    "/api/auth/google",
                    "/api/auth/forgot-password",
                    "/api/auth/reset-password",
                    "/api/account/password",
                }
                else ("newsletter" if path == "/api/newsletter" else None)
            )
            if group and request.method == "POST":
                limit = settings.auth_rate_limit if group == "auth" else settings.newsletter_rate_limit
                if not app.state.limiter.allow(group, limit):
                    return JSONResponse(
                        {"error": "درخواست‌های زیادی ارسال شده است. کمی بعد تلاش کنید."},
                        status_code=429,
                        headers={"Retry-After": "60", "Cache-Control": "no-store"},
                    )
            if request.method not in {"GET", "HEAD"} and not valid_csrf(request):
                return JSONResponse(
                    {"error": "Invalid CSRF token"}, status_code=400, headers={"Cache-Control": "no-store"}
                )
        response = await call_next(request)
        if path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(HTTPException)
    async def http_error(request, error):
        return JSONResponse(
            {"error": str(error.detail)}, status_code=error.status_code, headers=error.headers
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, error):
        # Do not echo passwords, Google tokens or connection details in errors.
        return JSONResponse(
            {"error": "اطلاعات واردشده معتبر نیست. فیلدهای فرم را بررسی کنید."}, status_code=400
        )

    @app.exception_handler(SQLAlchemyError)
    async def database_error(request, error):
        return JSONResponse(
            {"error": "سرویس سایت در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید."}, status_code=503
        )

    @app.get("/health", tags=["health"])
    def health():
        # Startup runs migrations before Uvicorn. A process probe must not keep
        # a scale-to-zero database awake with queries on every health check.
        return {"status": "ok"}

    app.include_router(auth.router)
    app.include_router(catalog.router)
    app.include_router(account.router)
    return app


app = create_app()
