"""Audit every locked Python distribution against the official PyPI advisory feed.

No installation or package execution is needed. Network failures fail the check;
an unavailable feed is never reported as a clean audit.
"""

import json
import sys
import tomllib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import urlopen


def audit(package):
    name, version = package["name"], package["version"]
    try:
        with urlopen(f"https://pypi.org/pypi/{name}/{version}/json", timeout=20) as response:
            data = json.load(response)
        vulnerabilities = [
            item["id"] for item in data.get("vulnerabilities", []) if not item.get("withdrawn")
        ]
        return {"name": name, "version": version, "vulnerabilities": vulnerabilities}
    except Exception:
        return {"name": name, "version": version, "error": "Advisory feed unavailable"}


def main():
    lock = tomllib.loads((Path(__file__).resolve().parents[1] / "uv.lock").read_text(encoding="utf-8"))
    packages = [p for p in lock["package"] if "registry" in p["source"]]
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(audit, packages))
    print(json.dumps({"source": "https://pypi.org", "packages": results}, indent=2))
    return int(any(item.get("error") or item.get("vulnerabilities") for item in results))


if __name__ == "__main__":
    sys.exit(main())
