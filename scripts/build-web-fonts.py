"""Optional build tool: compress existing bundled Vazirmatn fonts to WOFF2.

Requires fonttools and brotli in a build environment, not the application runtime.
Example: uv run --no-project --with fonttools --with brotli python scripts/build-web-fonts.py
The font license is retained in public/assets/fonts/OFL.txt.
"""
from pathlib import Path

from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
for weight in ('Regular', 'Bold'):
    source = root / f'public/assets/admin/Vazirmatn-{weight}.ttf'
    target = root / f'public/assets/fonts/Vazirmatn-{weight}.woff2'
    target.parent.mkdir(parents=True, exist_ok=True)
    font = TTFont(source)
    font.flavor = 'woff2'
    font.save(target)
    print(f'{weight}: {source.stat().st_size} -> {target.stat().st_size} bytes')
