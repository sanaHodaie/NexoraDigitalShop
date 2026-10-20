import asyncio
import json

import httpx
import pytest
from pydantic import SecretStr, ValidationError

from app.core.config import Settings
from app.infrastructure.assistant_llm import GeminiPlanner, OpenAIPlanner, make_planner

INTENT = dict(
    category="laptops",
    use_case="programming",
    device="laptop",
    queries=[],
    max_rial=500000000,
    min_ram=16,
    intent="recommend",
    sort="price_asc",
    clarify_budget=False,
)


def response(data=INTENT, finish="STOP"):
    return {"candidates": [{"finishReason": finish, "content": {"parts": [{"text": json.dumps(data)}]}}]}


def configured(settings, handler):
    settings.assistant_provider = "gemini"
    settings.assistant_model = "gemini-test-model"
    settings.gemini_api_key = SecretStr("test-google-key")
    settings.openai_api_key = None
    return make_planner(settings, httpx.MockTransport(handler))


def test_google_only_structured_request(settings):
    def handle(request):
        assert request.url.host == "generativelanguage.googleapis.com"
        assert request.url.path.endswith("/models/gemini-test-model:generateContent")
        assert not request.url.query
        assert request.headers["x-goog-api-key"] == "test-google-key"
        assert "authorization" not in request.headers
        body = json.loads(request.content)
        assert "plan_search" not in body["systemInstruction"]["parts"][0]["text"]
        assert json.loads(body["contents"][0]["parts"][0]["text"]) == ["لپتاپ برای برنامه‌نویسی"]
        schema = body["generationConfig"]["responseFormat"]["text"]["schema"]
        assert schema["additionalProperties"] is False
        assert body["generationConfig"]["maxOutputTokens"] == 2048
        return httpx.Response(200, json=response())

    planner = configured(settings, handle)
    assert isinstance(planner, GeminiPlanner) and planner.configured
    result = asyncio.run(planner.plan(["لپتاپ برای برنامه‌نویسی"]))
    assert result.max_rial == 500000000 and result.use_case == "programming"


@pytest.mark.parametrize("provider", ["gemini", "openai"])
def test_assistant_proxy_is_used_by_provider_client(settings, monkeypatch, provider):
    settings.assistant_provider = provider
    settings.assistant_model = "test-model"
    settings.gemini_api_key = SecretStr("google-key")
    settings.openai_api_key = SecretStr("openai-key")
    settings.assistant_proxy_url = SecretStr("http://127.0.0.1:12334")
    original = httpx.AsyncClient
    captured = []

    def client(**kwargs):
        captured.append(kwargs.pop("proxy"))
        kwargs["transport"] = httpx.MockTransport(lambda _: httpx.Response(503))
        return original(**kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", client)
    assert asyncio.run(make_planner(settings).plan(["hello"])) is None
    assert captured == ["http://127.0.0.1:12334"]


@pytest.mark.parametrize("url", ["socks5://localhost:12334", "http://", "http://localhost:99999", "http://localhost/path"])
def test_invalid_assistant_proxy_is_rejected(url):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, assistant_proxy_url=url)


def test_proxy_credentials_are_masked():
    settings = Settings(_env_file=None, assistant_proxy_url="http://user:private-proxy-password@localhost:12334")
    assert "private-proxy-password" not in repr(settings)
    assert Settings(_env_file=None, assistant_proxy_url="").assistant_proxy_url is None


@pytest.mark.parametrize(
    "data",
    [
        {},
        None,
        {"candidates": None},
        {"promptFeedback": {"blockReason": "SAFETY"}},
        response(finish="MAX_TOKENS"),
        response(finish="SAFETY"),
        response({"made_up_price": 1}),
        response(INTENT | {"max_rial": -1}),
        response(INTENT | {"queries": ["x" * 101]}),
        {"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": "not json"}]}}]},
    ],
)
def test_invalid_or_blocked_reply_falls_back(settings, data):
    planner = configured(settings, lambda _: httpx.Response(200, json=data))
    assert asyncio.run(planner.plan(["hello"])) is None


def test_thoughts_are_not_parsed_as_the_answer(settings):
    data = response()
    data["candidates"][0]["content"]["parts"].insert(0, {"thought": True, "text": "private reasoning"})
    planner = configured(settings, lambda _: httpx.Response(200, json=data))
    assert asyncio.run(planner.plan(["hello"])).category == "laptops"


@pytest.mark.parametrize("status", [400, 401, 403, 404, 429, 500])
def test_provider_errors_never_leak_key_or_question(settings, caplog, status):
    calls = []

    def handle(request):
        calls.append(request.url.host)
        return httpx.Response(status, text="test-google-key private-question")

    planner = configured(settings, handle)
    assert asyncio.run(planner.plan(["private-question"])) is None
    assert calls == ["generativelanguage.googleapis.com"]
    assert "test-google-key" not in caplog.text and "private-question" not in caplog.text


def test_timeout_and_oversized_response(settings):
    def timeout(request):
        raise httpx.ReadTimeout("secret", request=request)

    assert asyncio.run(configured(settings, timeout).plan(["hello"])) is None
    assert (
        asyncio.run(configured(settings, lambda _: httpx.Response(200, content=b"x" * 65537)).plan(["hello"]))
        is None
    )


def test_explicit_provider_and_missing_google_key(settings):
    settings.openai_api_key = SecretStr("another-provider-key")
    settings.assistant_model = "configured-model"
    assert isinstance(make_planner(settings), OpenAIPlanner)
    settings.assistant_provider = "gemini"
    planner = make_planner(settings)
    assert isinstance(planner, GeminiPlanner) and not planner.configured
    assert asyncio.run(planner.plan(["hello"])) is None
    with pytest.raises(ValidationError):
        Settings(_env_file=None, assistant_provider="unknown")


def test_google_key_is_masked():
    settings = Settings(_env_file=None, gemini_api_key="test-google-key")
    assert "test-google-key" not in repr(settings)
