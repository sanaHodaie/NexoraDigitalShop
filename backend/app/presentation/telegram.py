"""Browser routes use session+CSRF; bot confirmation uses a separate service key."""
import secrets

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field

from app.domain.errors import BusinessError
from app.infrastructure.rate_limit import enforce
from app.infrastructure.telegram_linking import TelegramLinking
from app.presentation.dependencies import current_user

router = APIRouter(tags=["telegram"])


def linking(request: Request):
    return TelegramLinking(request.app.state.engine)


@router.get("/api/account/telegram")
def status(request: Request, user=Depends(current_user), svc=Depends(linking)):
    return {**svc.status(user.id), "configured": bool(request.app.state.settings.telegram_bot_username
            and request.app.state.settings.telegram_bot_api_key)}


@router.post("/api/account/telegram/link")
def create_link(request: Request, user=Depends(current_user), svc=Depends(linking)):
    settings = request.app.state.settings
    if not settings.telegram_bot_username or not settings.telegram_bot_api_key:
        raise BusinessError(503, "اتصال تلگرام هنوز توسط فروشگاه فعال نشده است.")
    enforce(request, "telegram_link", str(user.id))
    token, expires = svc.create(user.id)
    return {"url": f"https://t.me/{settings.telegram_bot_username}?start={token}",
            "expiresAt": expires.isoformat()}


@router.delete("/api/account/telegram", status_code=204)
def unlink(user=Depends(current_user), svc=Depends(linking)):
    svc.unlink(user.id)
    return Response(status_code=204)


def bot_auth(request: Request):
    configured = request.app.state.settings.telegram_bot_api_key
    supplied = request.headers.get("X-Telegram-Bot-Key", "")
    if not configured or not secrets.compare_digest(
        supplied.encode(), configured.get_secret_value().encode()
    ):
        raise BusinessError(401, "Invalid bot credentials")


class Confirmation(BaseModel):
    token: str = Field(pattern=r"^[A-Za-z0-9_-]{43}$")
    telegram_user_id: int = Field(strict=True, gt=0, le=2**52 - 1)


@router.post("/internal/telegram/link-confirmations", dependencies=[Depends(bot_auth)])
def confirm(data: Confirmation, svc=Depends(linking)):
    return svc.confirm(data.token, data.telegram_user_id)
