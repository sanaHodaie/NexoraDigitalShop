from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from starlette.concurrency import run_in_threadpool

from app.domain.errors import BusinessError
from app.infrastructure.rate_limit import enforce
from app.presentation.dependencies import current_user, services

router = APIRouter(tags=["assistant"])
PROVIDER_LABELS = {"openai": "OpenAI", "gemini": "Google Gemini", "deepseek": "DeepSeek"}


class Message(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=1000)


class ChatInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    messages: list[Message] = Field(min_length=1, max_length=12)

    @model_validator(mode="after")
    def last_user(self):
        if self.messages[-1].role != "user" or not self.messages[-1].content.strip():
            raise ValueError("A user question is required")
        return self


class AssistantConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    enabled: bool = True
    useModel: bool = True
    maxRecommendations: int = Field(default=3, ge=1, le=4)
    dailyLimit: int = Field(default=300, ge=1, le=10000)
    greeting: str = Field(min_length=1, max_length=300)


class ConfigInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    data: AssistantConfig
    version: int = Field(ge=0)


@router.get("/api/assistant/config")
def public_configuration(request: Request, svc=Depends(services)):
    config = svc.assistant.configuration()["data"]
    return {
        "enabled": config["enabled"],
        "greeting": config["greeting"],
        "externalModel": config["useModel"] and request.app.state.assistant_planner.configured,
        "provider": PROVIDER_LABELS[request.app.state.settings.assistant_provider],
    }


@router.post("/api/assistant/chat")
async def chat(body: ChatInput, request: Request, svc=Depends(services)):
    await run_in_threadpool(enforce, request, "assistant")  # Shared Redis; do not block the event loop.
    config = (await run_in_threadpool(svc.assistant.configuration))["data"]
    if not config["enabled"]:
        raise BusinessError(503, "راهنمای خرید فعلاً غیرفعال است.", "ASSISTANT_DISABLED")
    messages = [message.content.strip() for message in body.messages if message.role == "user"][-6:]
    suggested = None
    if config["useModel"] and request.app.state.assistant_planner.configured:
        day = datetime.now(timezone.utc).date().isoformat()
        if await run_in_threadpool(
            request.app.state.limiter.allow, "assistant:model:" + day, config["dailyLimit"], 86400
        ):
            suggested = await request.app.state.assistant_planner.plan(messages)
    return await run_in_threadpool(
        svc.assistant.respond, messages, config, suggested, request.app.state.settings.assistant_provider
    )


@router.get("/api/admin/assistant")
def admin_configuration(request: Request, user=Depends(current_user), svc=Depends(services)):
    return {
        **svc.assistant.configuration(user.id),
        "provider": PROVIDER_LABELS[request.app.state.settings.assistant_provider],
        "model": request.app.state.settings.assistant_model,
        "configured": request.app.state.assistant_planner.configured,
    }


@router.put("/api/admin/assistant")
def save_configuration(body: ConfigInput, user=Depends(current_user), svc=Depends(services)):
    return svc.assistant.save(user.id, body.data.model_dump(), body.version)
