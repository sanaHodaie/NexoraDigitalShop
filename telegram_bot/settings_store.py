"""ذخیره‌ی تنظیمات کاربران (فعلاً زبان) در فایل JSON — بدون دیتابیس بیرونی."""
import json
import os
import threading


class SettingsStore:
    def __init__(self, data_dir: str = "./data"):
        os.makedirs(data_dir, exist_ok=True)
        self._path = os.path.join(data_dir, "user_settings.json")
        self._lock = threading.Lock()
        self._data = self._load()

    def _load(self) -> dict:
        try:
            with open(self._path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data if isinstance(data, dict) else {}
        except (OSError, ValueError):
            return {}

    def _save(self) -> None:
        temporary = self._path + ".tmp"
        with open(temporary, "w", encoding="utf-8") as f:
            json.dump(self._data, f, ensure_ascii=False, indent=2)
        os.replace(temporary, self._path)

    def get_lang(self, user_id: int) -> str:
        user = self._data.get(str(user_id), {})
        lang = user.get("lang", "fa") if isinstance(user, dict) else "fa"
        return lang if lang in ("fa", "en") else "fa"

    def set_lang(self, user_id: int, lang: str) -> None:
        if lang not in ("fa", "en"):
            return
        with self._lock:
            self._data.setdefault(str(user_id), {})["lang"] = lang
            self._save()