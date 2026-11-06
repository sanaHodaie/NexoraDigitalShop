from fastapi import Request, Response


def services(request: Request):
    return request.app.state.services


def current_user(request: Request):
    return services(request).identity.authenticate(session_token(request))


def session_token(request):
    if native_auth_path(request):
        # Supplying Authorization must never fall back to a browser cookie.
        if "authorization" in request.headers or request.url.path.rstrip("/") == "/api/mobile/session":
            return bearer_token(request)
    return request.cookies.get(request.app.state.settings.session_cookie, "")


def native_auth_path(request):
    path = request.url.path.rstrip("/")
    return path == "/api/mobile/session" or path.startswith("/api/admin/")


def bearer_token(request):
    parts = request.headers.get("authorization", "").split()
    if len(parts) == 2 and parts[0].lower() == "bearer" and 1 <= len(parts[1]) <= 128:
        return parts[1]
    return ""


def native_csrf_exempt(request):
    path = request.url.path.rstrip("/")
    # Native login creates a token, never a cookie session. Other exemptions
    # require a bearer header and the route still authenticates it server-side.
    return (path == "/api/mobile/session" and request.method == "POST") or (
        native_auth_path(request) and bool(bearer_token(request))
    )


def session_cookie(request: Request, response: Response, token=None):
    settings = request.app.state.settings
    options = dict(secure=settings.secure_cookies, httponly=True, samesite="strict", path="/")
    if token:
        response.set_cookie(settings.session_cookie, token, max_age=settings.session_days * 86400, **options)
    else:
        response.delete_cookie(settings.session_cookie, **options)
