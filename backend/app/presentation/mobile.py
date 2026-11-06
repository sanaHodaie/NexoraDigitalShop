"""Native admin sessions; browser sessions retain their cookie/CSRF contract.

Opaque, revocable sessions use the existing hashed session store, idle timeout,
rate limits and permission checks. No bot or database credential leaves the API.
"""
from fastapi import APIRouter, Depends, Request, Response

from app.domain.errors import BusinessError
from app.infrastructure.rate_limit import enforce
from app.presentation.dependencies import current_user, services, session_token
from app.presentation.schemas import Login

router = APIRouter(prefix="/api/mobile", tags=["mobile administration"])


@router.post("/session")
def login(data: Login, request: Request, svc=Depends(services)):
    enforce(request, "login", data.email)
    user, token = svc.identity.login(data.email, data.password)
    try:
        manager = svc.management.me(user.id)
    except BusinessError:
        svc.identity.logout(user.id, token)
        raise
    return {"token": token, "manager": manager}


@router.get("/session")
def session(user=Depends(current_user), svc=Depends(services)):
    return svc.management.me(user.id)


@router.delete("/session", status_code=204)
def logout(request: Request, user=Depends(current_user), svc=Depends(services)):
    svc.identity.logout(user.id, session_token(request))
    return Response(status_code=204)
