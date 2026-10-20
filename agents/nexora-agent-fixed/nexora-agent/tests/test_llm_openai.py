import json

import httpx
import pytest

from conftest import ScriptedLLM, text, tool
from nexora_agent.agent import Agent
from nexora_agent.config import Settings
from nexora_agent.llm import LLMUnavailable, OpenAICompatLLM, make_llm
from nexora_agent.tools import TOOLS


def llm_with(handler):
    return OpenAICompatLLM("http://x/v1", "m", "key", client=httpx.AsyncClient(
        base_url="http://x/v1/", transport=httpx.MockTransport(handler)))


async def test_translates_blocks_to_openai_format_and_back():
    sent = {}

    def handler(request):
        sent["url"], sent["body"] = str(request.url), json.loads(request.content)
        return httpx.Response(200, json={"choices": [{"message": {
            "content": None,
            "tool_calls": [{"id": "", "type": "function", "function": {"name": "search_products", "arguments": '{"query": "آیفون"}'}}],
        }}]})

    history = [
        {"role": "user", "content": "سلام"},
        {"role": "assistant", "content": [{"type": "text", "text": "لحظه"}, {"type": "tool_use", "id": "t1", "name": "list_categories", "input": {}}]},
        {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "t1", "content": "{}"}]},
    ]
    out = await llm_with(handler).create(system="S", tools=TOOLS, messages=history)

    assert sent["url"] == "http://x/v1/chat/completions"
    roles = [m["role"] for m in sent["body"]["messages"]]
    assert roles == ["system", "user", "assistant", "tool"]
    assert sent["body"]["messages"][2]["tool_calls"][0]["function"]["name"] == "list_categories"
    assert sent["body"]["messages"][3]["tool_call_id"] == "t1"
    assert sent["body"]["tools"][0]["function"]["parameters"]["type"] == "object"
    assert out.stop_reason == "tool_use"
    assert out.content == [{"type": "tool_use", "id": "call_0", "name": "search_products", "input": {"query": "آیفون"}}]


async def test_bad_arguments_json_and_plain_text_reply():
    bad = await llm_with(lambda r: httpx.Response(200, json={"choices": [{"message": {"content": "x", "tool_calls": [
        {"id": "a", "function": {"name": "list_categories", "arguments": "{oops"}}]}}]})).create(system="S", tools=[], messages=[])
    assert bad.content[1]["input"] == {}
    plain = await llm_with(lambda r: httpx.Response(200, json={"choices": [{"message": {"content": "سلام"}}]})).create(system="S", tools=[], messages=[])
    assert plain.stop_reason == "end_turn" and plain.content == [{"type": "text", "text": "سلام"}]


@pytest.mark.parametrize("response", [httpx.Response(401, json={}), httpx.Response(200, json={"nope": 1})])
async def test_failures_become_llm_unavailable(response):
    with pytest.raises(LLMUnavailable):
        await llm_with(lambda r: response).create(system="S", tools=[], messages=[])


def test_make_llm_selection():
    base = dict(_env_file=None, anthropic_api_key=None)
    assert make_llm(Settings(**base)) is None
    assert make_llm(Settings(**base, llm_provider="openai")) is None  # missing url/model
    ollama = make_llm(Settings(**base, llm_provider="openai", llm_base_url="http://localhost:11434/v1", llm_model="qwen2.5:7b"))
    assert isinstance(ollama, OpenAICompatLLM)  # no api key needed
    assert make_llm(Settings(_env_file=None, anthropic_api_key="sk-x")) is not None


async def test_full_agent_loop_over_openai_wire_format(catalog, settings):
    """Agent + adapter + real tools together, with a fake provider speaking OpenAI JSON."""
    replies = iter([
        {"choices": [{"message": {"content": None, "tool_calls": [{"id": "c1", "type": "function", "function": {"name": "search_products", "arguments": '{"query": "آیفون ۱۵", "limit": 1}'}}]}}]},
        {"choices": [{"message": {"content": "پیشنهاد من «اپل آیفون ۱۵» است."}}]},
    ])
    bodies = []

    def handler(request):
        bodies.append(json.loads(request.content))
        return httpx.Response(200, json=next(replies))

    agent = Agent(llm_with(handler), catalog, settings)
    reply = await agent.respond([{"role": "user", "content": "گوشی اپل"}])
    assert reply.products[0]["id"] == "phone-01"
    tool_msg = bodies[1]["messages"][-1]
    assert tool_msg["role"] == "tool" and "phone-01" in tool_msg["content"]
