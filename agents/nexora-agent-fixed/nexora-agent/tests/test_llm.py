import json

import pytest

# Newer anthropic SDKs ship their own HTTP layer (httpx2); older ones use httpx.
try:
    import httpx2 as httpx
except ImportError:
    import httpx
from anthropic import AsyncAnthropic

from nexora_agent.llm import AnthropicLLM, LLMUnavailable


def llm_with(handler):
    llm = AnthropicLLM("sk-test", "claude-sonnet-5-5")
    llm.client = AsyncAnthropic(api_key="sk-test", max_retries=0,
                                http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)))
    return llm


async def test_request_shape_and_tool_use_parsing():
    sent = {}

    def handler(request):
        sent.update(json.loads(request.content))
        return httpx.Response(200, json={
            "id": "msg_1", "type": "message", "role": "assistant", "model": "claude-sonnet-5-5",
            "stop_reason": "tool_use", "stop_sequence": None,
            "usage": {"input_tokens": 1, "output_tokens": 1},
            "content": [
                {"type": "text", "text": "یک لحظه"},
                {"type": "tool_use", "id": "toolu_1", "name": "search_products", "input": {"query": "آیفون"}},
            ],
        })

    out = await llm_with(handler).create(system="S", tools=[{"name": "t", "description": "d", "input_schema": {"type": "object"}}],
                                         messages=[{"role": "user", "content": "سلام"}])
    assert sent["model"] == "claude-sonnet-5-5" and sent["system"][0]["text"] == "S"
    assert out.stop_reason == "tool_use"
    assert out.content[1] == {"type": "tool_use", "id": "toolu_1", "name": "search_products", "input": {"query": "آیفون"}}


async def test_api_errors_become_llm_unavailable():
    with pytest.raises(LLMUnavailable):
        await llm_with(lambda r: httpx.Response(529, json={"type": "error", "error": {"type": "overloaded_error", "message": "x"}})).create(
            system="S", tools=[], messages=[{"role": "user", "content": "hi"}])
