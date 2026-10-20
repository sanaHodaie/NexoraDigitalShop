import json
import logging
from dataclasses import dataclass, field

from nexora_agent.catalog import Catalog
from nexora_agent.config import Settings
from nexora_agent.llm import LLM
from nexora_agent.prompts import SYSTEM_PROMPT
from nexora_agent.tools import TOOLS, ToolRunner

log = logging.getLogger("nexora.agent")

FALLBACK = "متأسفم، نتوانستم پاسخ کاملی آماده کنم. لطفاً سؤالتان را کمی دقیق‌تر بپرسید."


@dataclass
class AgentReply:
    text: str
    actions: list[dict] = field(default_factory=list)
    products: list[dict] = field(default_factory=list)


class Agent:
    """Stateless: the caller owns the conversation history, nothing is stored here."""

    def __init__(self, llm: LLM, catalog: Catalog, settings: Settings):
        self.llm, self.catalog, self.settings = llm, catalog, settings

    def _history(self, messages: list[dict]) -> list[dict]:
        cleaned = [
            {"role": m["role"], "content": m["content"][: self.settings.max_message_chars]}
            for m in messages
            if m.get("role") in {"user", "assistant"} and isinstance(m.get("content"), str) and m["content"].strip()
        ][-self.settings.max_history_messages :]
        while cleaned and cleaned[0]["role"] != "user":
            cleaned.pop(0)  # the API requires the conversation to start with the user
        return cleaned

    async def respond(self, messages: list[dict]) -> AgentReply:
        history = self._history(messages)
        if not history:
            return AgentReply(FALLBACK)
        runner = ToolRunner(self.catalog, self.settings)
        convo = list(history)

        for _ in range(self.settings.max_tool_rounds):
            response = await self.llm.create(system=SYSTEM_PROMPT, tools=TOOLS, messages=convo)
            convo.append({"role": "assistant", "content": response.content})
            calls = [b for b in response.content if b["type"] == "tool_use"]
            if not calls:
                text = "\n".join(b["text"] for b in response.content if b["type"] == "text").strip()
                text = text or FALLBACK
                return AgentReply(text, runner.actions, runner.ui_cards(text))
            results = []
            for call in calls:
                result, is_error = await runner.run(call["name"], call["input"])
                log.info("tool=%s error=%s", call["name"], is_error)  # never log message content
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": call["id"],
                        "content": json.dumps(result, ensure_ascii=False),
                        **({"is_error": True} if is_error else {}),
                    }
                )
            convo.append({"role": "user", "content": results})

        log.warning("tool round limit reached")
        return AgentReply(FALLBACK, runner.actions)
