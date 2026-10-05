import secrets

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from google.auth.exceptions import TransportError
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AuthSession, PasswordReset, User, utcnow
from app.recovery import deliver_recovery
from app.schemas import (
    AccountOutput,
    EmailInput,
    GoogleCredential,
    Login,
    Registration,
    ResetPassword,
    normalize_email,
)
from app.security import csrf_token, current_user, password_hasher, sign_in, token_hash, verify_password

router = APIRouter(prefix="/api", tags=["authentication"])


@router.post("/auth/forgot-password", status_code=202)
def forgot_password(data: EmailInput, request: Request, tasks: BackgroundTasks):
    settings = request.app.state.settings
    if (
        not settings.resend_api_key
        or not settings.resend_api_key.get_secret_value()
        or not settings.mail_from
    ):
        raise HTTPException(503, "ارسال ایمیل بازیابی هنوز فعال نشده است. لطفاً کمی بعد تلاش کنید.")
    tasks.add_task(deliver_recovery, request.app.state.engine, settings, data.email)
    return {
        "message": "اگر این ایمیل حسابی با رمز عبور داشته باشد، لینک بازیابی ارسال می‌شود. پوشهٔ اسپم را هم بررسی کنید."
    }


@router.post("/auth/reset-password", status_code=204)
def reset_password(data: ResetPassword, request: Request, db: Session = Depends(get_db)):
    digest = token_hash(data.token)
    user_id = db.scalar(select(PasswordReset.user_id).where(PasswordReset.token_hash == digest))
    if user_id is not None:
        db.scalar(select(User).where(User.id == user_id).with_for_update())
    claimed = db.execute(
        delete(PasswordReset)
        .where(PasswordReset.token_hash == digest, PasswordReset.expires_at > utcnow())
        .returning(PasswordReset.user_id)
    ).scalar_one_or_none()
    if claimed is None:
        raise HTTPException(400, "لینک بازیابی نامعتبر یا منقضی شده است. دوباره درخواست بازیابی بدهید.")
    user = db.get(User, claimed)
    user.password_hash = password_hasher.hash(data.password)
    db.execute(delete(PasswordReset).where(PasswordReset.user_id == claimed))
    db.execute(delete(AuthSession).where(AuthSession.user_id == claimed))
    db.commit()
    response = Response(status_code=204)
    settings = request.app.state.settings
    response.delete_cookie(
        settings.session_cookie, secure=settings.secure_cookies, httponly=True, samesite="strict", path="/"
    )
    return response


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
    response.headers["Cache-Control"] = "no-store"
    return {"token": csrf_token(settings, nonce, request.cookies.get(settings.session_cookie, ""))}


@router.post("/auth/register")
def register(data: Registration, request: Request, response: Response, db: Session = Depends(get_db)):
    user = User(
        email=data.email, password_hash=password_hasher.hash(data.password), full_name=data.full_name or ""
    )
    db.add(user)
    try:
        db.flush()
        sign_in(request, response, db, user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "این ایمیل قبلاً ثبت شده است. وارد حساب خود شوید.") from None
    return {"email": user.email}


@router.post("/auth/login")
def login(data: Login, request: Request, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.strip().lower()))
    if not verify_password(data.password, user.password_hash if user else None):
        raise HTTPException(401, "ایمیل یا رمز عبور نادرست است.")
    sign_in(request, response, db, user)
    return {"email": user.email}


@router.post("/auth/logout", status_code=204)
def logout(request: Request, db: Session = Depends(get_db), user: User = Depends(current_user)):
    settings = request.app.state.settings
    db.execute(
        delete(AuthSession).where(
            AuthSession.token_hash == token_hash(request.cookies[settings.session_cookie])
        )
    )
    db.commit()
    response = Response(status_code=204)
    response.delete_cookie(
        settings.session_cookie, secure=settings.secure_cookies, httponly=True, samesite="strict", path="/"
    )
    return response


@router.get("/auth/me", response_model=AccountOutput)
def me(user: User = Depends(current_user)):
    return user


@router.get("/auth/providers")
def providers(request: Request):
    return {"googleClientId": request.app.state.settings.google_client_id}


@router.post("/auth/google", response_model=AccountOutput)
def google(data: GoogleCredential, request: Request, response: Response, db: Session = Depends(get_db)):
    client_id = request.app.state.settings.google_client_id
    if not client_id:
        raise HTTPException(503, "ورود با گوگل هنوز فعال نشده است. از ایمیل و رمز عبور استفاده کنید.")
    if data.credential.count(".") != 2:
        raise HTTPException(401, "تأیید حساب گوگل ناموفق بود. دوباره تلاش کنید.")
    try:
        transport = GoogleRequest()

        def bounded_request(*args, **kwargs):
            kwargs["timeout"] = 10
            return transport(*args, **kwargs)

        payload = id_token.verify_oauth2_token(data.credential, bounded_request, client_id)
        subject = payload.get("sub")
        if (
            payload.get("email_verified") is not True
            or not isinstance(subject, str)
            or not 1 <= len(subject) <= 255
        ):
            raise ValueError("Invalid Google identity")
        email = normalize_email(payload.get("email", ""))
    except TransportError:
        raise HTTPException(503, "ارتباط با گوگل برقرار نشد. دوباره تلاش کنید.") from None
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(401, "تأیید حساب گوگل ناموفق بود. دوباره تلاش کنید.") from None
    user = db.scalar(select(User).where(User.google_subject == subject))
    if user is None:
        if db.scalar(select(User).where(User.email == email)):
            raise HTTPException(409, "این ایمیل قبلاً ثبت شده است. با رمز عبور حساب خود وارد شوید.")
        user = User(email=email, full_name=str(payload.get("name") or "")[:100], google_subject=subject)
        db.add(user)
    try:
        db.flush()
        sign_in(request, response, db, user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "حساب قبلاً ایجاد شده است. دوباره وارد شوید.") from None
    return user
