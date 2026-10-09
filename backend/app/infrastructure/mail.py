import json
from urllib.request import Request, urlopen


class EmailSender:
    def __init__(self, settings):
        self.settings = settings

    def send(self, kind, payload, job_id):
        settings = self.settings
        if not settings.resend_api_key or not settings.mail_from:
            raise RuntimeError("Email unavailable")
        messages = {
            "password_changed": "رمز عبور حساب نکسورای شما تغییر کرد. اگر این کار را انجام نداده‌اید، فوراً بازیابی رمز را انجام دهید.",
            "email_change_notice": "درخواست تغییر ایمیل حساب نکسورای شما ثبت شد. اگر این درخواست متعلق به شما نیست، رمز عبورتان را تغییر دهید.",
        }
        if kind in {"reset_link", "verify_link", "email_change_link"}:
            route = {
                "reset_link": "/reset-password",
                "verify_link": "/verify-email",
                "email_change_link": "/confirm-email-change",
            }[kind]
            fragment = "token=" + payload["token"]
            link = settings.frontend_url.rstrip("/") + route + "#" + fragment
            message = (
                "برای تکمیل درخواست خود لینک زیر را باز کنید. این لینک یک‌بارمصرف و دارای ۳۰ دقیقه اعتبار است.\n"
                + link
            )
        else:
            message = messages[kind]
        request = Request(
            "https://api.resend.com/emails",
            data=json.dumps(
                {
                    "from": settings.mail_from,
                    "to": [payload["email"]],
                    "subject": "اطلاع‌رسانی حساب نکسورا",
                    "text": message,
                }
            ).encode(),
            headers={
                "Authorization": "Bearer " + settings.resend_api_key.get_secret_value(),
                "Content-Type": "application/json",
                "Idempotency-Key": f"nexora-email-{job_id}",
            },
            method="POST",
        )
        with urlopen(request, timeout=15) as response:
            if response.status != 200:
                raise RuntimeError("Email delivery failed")
