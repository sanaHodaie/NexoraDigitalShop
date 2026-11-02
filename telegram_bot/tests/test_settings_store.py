from settings_store import SettingsStore


def test_default_language_is_persian(tmp_path):
    s = SettingsStore(str(tmp_path))
    assert s.get_lang(1) == "fa"


def test_set_and_persist_language(tmp_path):
    s = SettingsStore(str(tmp_path))
    s.set_lang(1, "en")
    assert s.get_lang(1) == "en"
    # نمونه‌ی جدید باید تنظیم ذخیره‌شده را از فایل بخواند
    s2 = SettingsStore(str(tmp_path))
    assert s2.get_lang(1) == "en"


def test_invalid_language_ignored(tmp_path):
    s = SettingsStore(str(tmp_path))
    s.set_lang(1, "de")
    assert s.get_lang(1) == "fa"


def test_users_are_independent(tmp_path):
    s = SettingsStore(str(tmp_path))
    s.set_lang(1, "en")
    s.set_lang(2, "fa")
    assert s.get_lang(1) == "en"
    assert s.get_lang(2) == "fa"