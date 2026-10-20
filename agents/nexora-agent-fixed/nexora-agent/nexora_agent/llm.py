"""Thin LLM port. The agent depends on this protocol, not on a vendor SDK, so
tests use a scripted fake and another provider can be added without touching
the agent loop."""

import json
from dataclasses import dataclass
from typing import Any, Protocol

import httpx


class LLMUnavailable(Exception):
    pass


@dataclass
class LLMResponse:
    stop_reason: str
    content: list[dict[str, Any]]  # {"type": "text"|"tool_use", ...}


class LLM(Protocol):
    async def create(self, *, system: str, tools: list[dict], messages: list[dict]) -> LLMResponse: ...


class AnthropicLLM:
    def __init__(self, api_key: str, model: str, max_tokens: int = 1024):
        from anthropic import AsyncAnthropic

        self.client = AsyncAnthropic(api_key=api_key, timeout=30, max_retries=2)
        self.model, self.max_tokens = model, max_tokens

    async def create(self, *, system, tools, messages) -> LLMResponse:
        from anthropic import APIError

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
                tools=tools,
                messages=messages,
            )
        except APIError as error:
            raise LLMUnavailable(type(error).__name__) from error
        content = []
        for block in response.content:
            if block.type == "text":
                content.append({"type": "text", "text": block.text})
            elif block.type == "tool_use":
                content.append({"type": "tool_use", "id": block.id, "name": block.name, "input": block.input})
        return LLMResponse(response.stop_reason or "end_turn", content)


class OpenAICompatLLM:
    """Any /chat/completions endpoint with tool calling (Ollama, Gemini, Groq, OpenRouter...).

    The agent speaks Anthropic-style blocks internally; this adapter translates both ways.
    """

    def __init__(self, base_url: str, model: str, api_key: str = "", max_tokens: int = 1024,
                 client: httpx.AsyncClient | None = None):
        headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        self.client = client or httpx.AsyncClient(base_url=base_url.rstrip("/") + "/", headers=headers, timeout=120)
        self.model, self.max_tokens = model, max_tokens

    @staticmethod
    def _messages(system: str, messages: list[dict]) -> list[dict]:
        out = [{"role": "system", "content": system}]
        for m in messages:
            content = m["content"]
            if isinstance(content, str):
                out.append({"role": m["role"], "content": content})
            elif m["role"] == "assistant":
                text = "\n".join(b["text"] for b in content if b["type"] == "text")
                calls = [
                    {"id": b["id"], "type": "function",
                     "function": {"name": b["name"], "arguments": json.dumps(b["input"], ensure_ascii=False)}}
                    for b in content if b["type"] == "tool_use"
                ]
                out.append({"role": "assistant", "content": text or None, **({"tool_calls": calls} if calls else {})})
            else:  # tool results
                out += [{"role": "tool", "tool_call_id": b["tool_use_id"], "content": b["content"]}
                        for b in content if b["type"] == "tool_result"]
        return out

    async def create(self, *, system, tools, messages) -> LLMResponse:
        body = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "messages": self._messages(system, messages),
            "tools": [{"type": "function", "function": {"name": t["name"], "description": t["description"],
                                                       "parameters": t["input_schema"]}} for t in tools],
        }
        try:
            response = await self.client.post("chat/completions", json=body)
            response.raise_for_status()
            message = response.json()["choices"][0]["message"]
        except (httpx.HTTPError, ValueError, KeyError, IndexError) as error:
            raise LLMUnavailable(type(error).__name__) from error
        content = []
        if message.get("content"):
            content.append({"type": "text", "text": message["content"]})
        for i, call in enumerate(message.get("tool_calls") or []):
            try:
                args = json.loads(call["function"].get("arguments") or "{}")
            except ValueError:
                args = {}
            content.append({"type": "tool_use", "id": call.get("id") or f"call_{i}",
                            "name": call["function"]["name"], "input": args if isinstance(args, dict) else {}})
        has_calls = any(b["type"] == "tool_use" for b in content)
        return LLMResponse("tool_use" if has_calls else "end_turn", content)


def make_llm(settings) -> "LLM | None":
    """Returns None when the chosen provider is not configured."""
    if settings.llm_provider == "openai":
        if not (settings.llm_base_url and settings.llm_model):
            return None
        key = settings.llm_api_key.get_secret_value() if settings.llm_api_key else ""
        return OpenAICompatLLM(settings.llm_base_url, settings.llm_model, key, settings.max_tokens)
    if not settings.anthropic_api_key:
        return None
    return AnthropicLLM(settings.anthropic_api_key.get_secret_value(), settings.agent_model, settings.max_tokens)
