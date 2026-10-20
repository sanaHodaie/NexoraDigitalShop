from fastapi.testclient import TestClient

from conftest import ScriptedLLM, text
from nexora_agent.agent import Agent
from nexora_agent.llm import LLMUnavailable
from nexora_agent.server import create_app

URL = "/api/assistant/chat"
MSG = {"messages": [{"role": "user", "content": "سلام"}]}


def client(settings, catalog, llm=None):
    agent = Agent(llm or ScriptedLLM(text("سلام! چطور کمک کنم؟")), catalog, settings) if llm != "none" else None
    return TestClient(create_app(settings, agent))


def test_chat_ok(settings, catalog):
    r = client(settings, catalog).post(URL, json=MSG)
    assert r.status_code == 200
    assert r.json() == {"reply": "سلام! چطور کمک کنم؟", "actions": [], "products": []}


def test_not_configured_returns_503_in_backend_format(settings, catalog):
    r = client(settings, catalog, "none").post(URL, json=MSG)
    assert r.status_code == 503 and r.json()["code"] == "ASSISTANT_NOT_CONFIGURED" and "error" in r.json()


def test_last_message_must_be_from_user(settings, catalog):
    body = {"messages": [{"role": "user", "content": "a"}, {"role": "assistant", "content": "b"}]}
    r = client(settings, catalog).post(URL, json=body)
    assert r.status_code == 400 and r.json()["code"] == "VALIDATION_ERROR"


def test_invalid_payloads_rejected(settings, catalog):
    c = client(settings, catalog)
    assert c.post(URL, json={"messages": []}).status_code == 400
    assert c.post(URL, json={"messages": [{"role": "system", "content": "x"}]}).status_code == 400
    assert c.post(URL, json={"messages": [{"role": "user", "content": "x" * 1001}]}).status_code == 400


def test_rate_limit(settings, catalog):
    settings.rate_limit_per_minute = 2
    c = client(settings, catalog)
    codes = [c.post(URL, json=MSG).status_code for _ in range(3)]
    assert codes == [200, 200, 429]


def test_llm_outage_is_503_without_leaking_details(settings, catalog):
    class Down:
        async def create(self, **_):
            raise LLMUnavailable("APIConnectionError: secret-host")

    r = client(settings, catalog, Down()).post(URL, json=MSG)
    assert r.status_code == 503 and "secret-host" not in r.text and r.json()["code"] == "ASSISTANT_UNAVAILABLE"


def test_health(settings, catalog):
    assert client(settings, catalog).get("/health").json() == {"status": "ok", "llm_configured": True}


def test_router_mounts_into_any_fastapi_app(settings, catalog):
    """This is exactly how the main backend will include the assistant."""
    from fastapi import FastAPI

    from nexora_agent.server import make_router

    host = FastAPI()
    agent = Agent(ScriptedLLM(text("سلام")), catalog, settings)
    host.include_router(make_router(settings, lambda: agent))
    r = TestClient(host).post(URL, json=MSG)
    assert r.status_code == 200 and r.json()["reply"] == "سلام"


def test_backend_style_limiter_is_accepted(settings, catalog):
    """The main backend's limiters use allow(key, limit, seconds); make_router must work with them."""
    from fastapi import FastAPI

    from nexora_agent.server import make_router

    class BackendLike:
        def __init__(self):
            self.keys = []

        def allow(self, key, limit, seconds=60):
            self.keys.append((key, limit, seconds))
            return True

    limiter = BackendLike()
    agent = Agent(ScriptedLLM(text("سلام")), catalog, settings)
    app = FastAPI()
    app.include_router(make_router(settings, lambda: agent, limiter, key_func=lambda r: "1.2.3.4"))
    assert TestClient(app).post(URL, json=MSG).status_code == 200
    assert limiter.keys == [("assistant:1.2.3.4", settings.rate_limit_per_minute, 60)]


def test_daily_cap_stops_requests(settings, catalog):
    settings.daily_request_cap = 1
    c = client(settings, catalog)
    first, second = c.post(URL, json=MSG), c.post(URL, json=MSG)
    assert first.status_code == 200
    assert second.status_code == 429 and second.json()["code"] == "ASSISTANT_DAILY_LIMIT"
