$ErrorActionPreference = "Stop"
if (-not (Test-Path ".venv\Scripts\python.exe")) {
    throw "محیط مجازی پیدا نشد. ابتدا py -3.12 -m venv .venv و نصب وابستگی‌ها را اجرا کنید."
}
& .\.venv\Scripts\python.exe -m pytest -v
exit $LASTEXITCODE
