import json
from pathlib import Path

import pytest

from nexora_agent.catalog import FileCatalog
from nexora_agent.config import Settings
from nexora_agent.llm import LLMResponse

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def settings():
    return Settings(_env_file=None, catalog_file=str(ROOT / "data/catalog-products.json"), anthropic_api_key=None)


@pytest.fixture
def catalog(settings):
    return FileCatalog(settings.catalog_file)


class ScriptedLLM:
    """Returns pre-programmed responses and records what the agent sent."""

    def __init__(self, *responses):
        self.responses, self.calls = list(responses), []

    async def create(self, *, system, tools, messages):
        self.calls.append({"system": system, "tools": tools, "messages": json.loads(json.dumps(messages))})
        return self.responses.pop(0) if len(self.responses) > 1 else self.responses[0]


def text(t):
    return LLMResponse("end_turn", [{"type": "text", "text": t}])


def tool(name, **args):
    return LLMResponse("tool_use", [{"type": "tool_use", "id": f"toolu_{name}", "name": name, "input": args}])
