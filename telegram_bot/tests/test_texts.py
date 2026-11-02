from texts import DEFAULT_LANG, TEXTS, tr


def test_fa_and_en_have_same_keys():
    assert set(TEXTS["fa"].keys()) == set(TEXTS["en"].keys())


def test_default_language_is_persian():
    assert DEFAULT_LANG == "fa"
    assert tr("fa", "main_menu") == TEXTS["fa"]["main_menu"]


def test_unknown_lang_falls_back_to_persian():
    assert tr("xx", "main_menu") == TEXTS["fa"]["main_menu"]


def test_unknown_key_returns_key():
    assert tr("fa", "nonexistent_key") == "nonexistent_key"


def test_placeholders_exist():
    assert "{name}" in TEXTS["fa"]["welcome"]
    assert "{q}" in TEXTS["fa"]["search_empty"]
    assert "{status}" in TEXTS["fa"]["err_http"]