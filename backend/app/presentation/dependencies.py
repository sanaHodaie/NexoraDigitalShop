from fastapi import Request, Response


def services(request: Request):
    return request.app.state.services


def current_user(request: Request):
    return services(request).identity.authenticate(session_token(request))


def session_token(request):
    return request.cookies.get(request.app.state.settings.session_cookie, "")


def session_cookie(request: Request, response: Response, token=None):
    settings = request.app.state.settings
    options = dict(secure=settings.secure_cookies, httponly=True, samesite="strict", path="/")
    if token:
        response.set_cookie(settings.session_cookie, token, max_age=settings.session_days * 86400, **options)
    else:
        response.delete_cookie(settings.session_cookie, **options)
