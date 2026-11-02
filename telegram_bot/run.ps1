$ErrorActionPreference = "Stop"
if (-not (Test-Path ".env")) {
    throw "فایل .env وجود ندارد. ابتدا .env.example را به .env کپی و تنظیم کنید."
}
if (-not (Test-Path ".venv\Scripts\python.exe")) {
    throw "محیط مجازی پیدا نشد. ابتدا دستور py -3.12 -m venv .venv را اجرا و وابستگی‌ها را نصب کنید."
}
& .\.venv\Scripts\python.exe main.py

exit $LASTEXITCODE
