"""Telegram-hosted image IDs avoid repeated file uploads."""


class MemoryMediaCache:
    def __init__(self):
        self.files = {}

    async def get(self, key):
        return self.files.get(key)

    async def set(self, key, value):
        self.files[key] = value

    async def delete(self, key):
        self.files.pop(key, None)
