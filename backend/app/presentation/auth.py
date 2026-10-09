import secrets

from fastapi import APIRouter, Depends, Request, Response

from app.infrastructure.crypto import csrf_token
from app.infrastructure.rate_limit import enforce
from app.presentation.dependencies import current_user, services, session_cookie, session_token
from app.presentation.schemas import (
    AccountOutput,
    EmailInput,
    GoogleCredential,
    Login,
    Registration,
    ResetPassword,
    TokenInput,
)

router = APIRouter(prefix="/api", tags=["authentication"])


@router.get("/csrf")
def csrf(request: Request, response: Response):
    settings = request.app.state.settings
    nonce = request.cookies.get(settings.csrf_cookie)
    if not nonce or len(nonce) > 128:
        nonce = secrets.token_urlsafe(32)
    response.set_cookie(
        settings.csrf_cookie,
        nonce,
        secure=settings.secure_cookies,
        httponly=True,
        samesite="strict",
        path="/",
    )
    return {"token": csrf_token(settings, nonce, session_token(request))}


@router.post("/auth/register", status_code=202)
def register(data: Registration, request: Request, svc=Depends(services)):
    enforce(request, "registration", data.email)
    return svc.identity.register(data.email, data.password, data.full_name)


@router.post("/auth/login", response_model=AccountOutput)
def login(data: Login, request: Request, response: Response, svc=Depends(services)):
    enforce(request, "login", data.email)
    user, token = svc.identity.login(data.email, data.password, session_token(request))
    session_cookie(request, response, token)
    return user


@router.post("/auth/logout", status_code=204)
def logout(request: Request, user=Depends(current_user), svc=Depends(services)):
    svc.identity.logout(user.id, session_token(request))
    response = Response(status_code=204)
    session_cookie(request, response)
    return response


@router.post("/auth/logout-all", status_code=204)
def logout_all(request: Request, user=Depends(current_user), svc=Depends(services)):
    svc.identity.logout(user.id, session_token(request), all_devices=True)
    response = Response(status_code=204)
    session_cookie(request, response)
    return response


@router.get("/auth/me", response_model=AccountOutput)
def me(user=Depends(current_user)):
    return user


@router.get("/auth/providers")
def providers(request: Request):
    return {"googleClientId": request.app.state.settings.google_client_id}


@router.post("/auth/google", response_model=AccountOutput)
def google(data: GoogleCredential, request: Request, response: Response, svc=Depends(services)):
    enforce(request, "google")
    user, token = svc.identity.google_login(data.credential, session_token(request))
    session_cookie(request, response, token)
    return user


@router.post("/auth/forgot-password", status_code=202)
def forgot_password(data: EmailInput, request: Request, svc=Depends(services)):
    enforce(request, "forgot_password", data.email)
    return svc.identity.forgot_password(data.email)


@router.post("/auth/reset-password", status_code=204)
def reset_password(data: ResetPassword, request: Request, svc=Depends(services)):
    enforce(request, "reset_password", data.token)
    svc.identity.reset_password(data.token, data.password)
    response = Response(status_code=204)
    session_cookie(request, response)
    return response


@router.post("/auth/request-verification", status_code=202)
def request_verification(data: EmailInput, request: Request, svc=Depends(services)):
    enforce(request, "verification_request", data.email)
    return svc.identity.request_verification(data.email)


@router.post("/auth/verify-email", status_code=204)
def verify_email(data: TokenInput, request: Request, svc=Depends(services)):
    enforce(request, "email_verification", data.token)
    svc.identity.verify_email(data.token)
    return Response(status_code=204)


@router.post("/auth/confirm-email-change", status_code=204)
def confirm_email_change(data: TokenInput, request: Request, svc=Depends(services)):
    enforce(request, "email_change", data.token)
    svc.identity.confirm_email_change(data.token)
    response = Response(status_code=204)
    session_cookie(request, response)
    return response
