from google.auth.exceptions import TransportError
from google.auth.transport.requests import Request
from google.oauth2 import id_token

from app.domain.errors import BusinessError


class GoogleAdapter:
    def __init__(self, client_id):
        self.client_id = client_id

    def verify(self, credential):
        if not self.client_id:
            raise BusinessError(503, "ورود با گوگل هنوز فعال نشده است.")
        if credential.count(".") != 2:
            raise BusinessError(401, "تأیید حساب گوگل ناموفق بود.")
        try:
            transport = Request()

            def bounded(*args, **kwargs):
                kwargs["timeout"] = 10
                return transport(*args, **kwargs)

            payload = id_token.verify_oauth2_token(credential, bounded, self.client_id)
            subject, email = payload.get("sub"), payload.get("email")
            if (
                payload.get("email_verified") is not True
                or not isinstance(subject, str)
                or not 1 <= len(subject) <= 255
                or not isinstance(email, str)
                or len(email) > 254
                or "@" not in email
            ):
                raise ValueError()
            return {
                "subject": subject,
                "email": email.strip().lower(),
                "name": str(payload.get("name") or "")[:100],
            }
        except TransportError:
            raise BusinessError(503, "ارتباط با گوگل برقرار نشد.") from None
        except (ValueError, TypeError, AttributeError):
            raise BusinessError(401, "تأیید حساب گوگل ناموفق بود.") from None
