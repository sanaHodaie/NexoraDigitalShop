import pytest

from config import load_config


def test_load_config_reads_env(monkeypatch):
    monkeypatch.setenv("BOT_TOKEN", "123:test-token")
    monkeypatch.setenv("NEXORA_API_URL", "http://localhost:8000/")
    monkeypatch.setenv("PAGE_SIZE", "3")

    cfg = load_config()

    assert cfg.bot_token == "123:test-token"
    assert cfg.api_base_url == "http://localhost:8000"  # اسلش انتهایی حذف شده
    assert cfg.page_size == 3


def test_missing_token_raises(monkeypatch):
    monkeypatch.delenv("BOT_TOKEN", raising=False)
    with pytest.raises(RuntimeError):
        load_config()


def test_page_size_clamped(monkeypatch):
    monkeypatch.setenv("BOT_TOKEN", "123:test-token")
    monkeypatch.setenv("PAGE_SIZE", "99")
    cfg = load_config()
    assert cfg.page_size == 10