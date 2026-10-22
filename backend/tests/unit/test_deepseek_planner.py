import asyncio
import json

import httpx
import pytest
from pydantic import SecretStr

from app.core.config import Settings
from app.infrastructure.assistant_llm import DeepSeekPlanner, make_planner

INTENT = {
    "category": "laptops", "use_case": "programming", "device": "laptop",
    "queries": [], "max_rial": 500000000, "min_ram": 16,
    "intent": "recommend", "sort": "price_asc", "clarify_budget": False,
}


def reply(intent=INTENT, finish="stop"):
    return {"choices": [{"finish_reason": finish, "message": {"content": json.dumps(intent)}}]}


def configured(settings, handler):
    settings.assistant_provider = "deepseek"
    settings.assistant_model = "deepseek-flash"
    settings.deepseek_api_key = SecretStr("test-deepseek-secret")
    return make_planner(settings, httpx.MockTransport(handler))


def test_deepseek_json_contract_and_provider_isolation(settings):
    settings.openai_api_key = SecretStr("other-provider-secret")
    settings.gemini_api_key = SecretStr("another-provider-secret")

    def handle(request):
        assert str(request.url) == "https://api.deepseek.com/chat/completions"
        assert request.headers["authorization"] == "Bearer test-deepseek-secret"
        body = json.loads(request.content)
        assert body["response_format"] == {"type": "json_object"}
        assert body["thinking"] == {"type": "disabled"}
        assert body["model"] == "deepseek-flash"
        assert body["max_tokens"] == 1200
        assert not {"store", "tools", "max_completion_tokens"} & body.keys()
        assert "JSON schema" in body["messages"][0]["content"]
        assert json.loads(body["messages"][1]["content"]) == ["لپتاپ برای برنامه‌نویسی"]
        return httpx.Response(200, json=reply())

    planner = configured(settings, handle)
    assert isinstance(planner, DeepSeekPlanner)
    plan = asyncio.run(planner.plan(["لپتاپ برای برنامه‌نویسی"]))
    assert plan.use_case == "programming" and plan.max_rial == 500000000


@pytest.mark.parametrize("data", [
    {}, None, {"choices": []}, {"choices": None}, reply(finish="length"),
    reply(INTENT | {"price": 1}), reply(INTENT | {"max_rial": -1}),
    reply(INTENT | {"max_rial": "500000000"}), reply(INTENT | {"queries": ["x" * 101]}),
    {"choices": [{"finish_reason": "stop", "message": {"content": ""}}]},
    {"choices": [{"finish_reason": "stop", "message": {"content": "{}", "tool_calls": [{}]}}]},
])
def test_invalid_truncated_or_untrusted_output_falls_back(settings, data):
    planner = configured(settings, lambda _: httpx.Response(200, json=data))
    assert asyncio.run(planner.plan(["hello"])) is None


@pytest.mark.parametrize("status", [401, 402, 403, 429, 503])
def test_errors_do_not_leak_secrets_or_call_other_providers(settings, caplog, status):
    calls = []

    def handle(request):
        calls.append(request.url.host)
        return httpx.Response(status, text="test-deepseek-secret private-question")

    assert asyncio.run(configured(settings, handle).plan(["private-question"])) is None
    assert calls == ["api.deepseek.com"]
    assert str(status) in caplog.text
    assert "test-deepseek-secret" not in caplog.text and "private-question" not in caplog.text


def test_timeout_and_response_size_limit(settings):
    def timeout(request):
        raise httpx.ReadTimeout("private", request=request)

    assert asyncio.run(configured(settings, timeout).plan(["hello"])) is None
    planner = configured(settings, lambda _: httpx.Response(200, content=b"x" * 65537))
    assert asyncio.run(planner.plan(["hello"])) is None


def test_missing_key_cannot_use_another_providers_key(settings):
    settings.assistant_provider = "deepseek"
    settings.assistant_model = "deepseek-flash"
    settings.openai_api_key = SecretStr("other-provider-secret")
    planner = make_planner(settings)
    assert not planner.configured
    assert asyncio.run(planner.plan(["hello"])) is None
    assert "test-deepseek-secret" not in repr(Settings(_env_file=None, deepseek_api_key="test-deepseek-secret"))
