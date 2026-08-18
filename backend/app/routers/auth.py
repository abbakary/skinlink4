from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException

from app.auth import create_access_token, get_current_user
from app.schemas import LoginRequest, TokenResponse
from app.store import store

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    user = store.get_user_by_email(body.email)
    if not user or not store.verify_password(body.email, body.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("status") == "disabled":
        raise HTTPException(status_code=403, detail="Account disabled")
    tenant = store.get_tenant(user["tenantId"]) if user.get("tenantId") else None
    token = create_access_token(user["id"], user.get("tenantId"))
    return TokenResponse(
        access_token=token,
        user=user,
        tenant=tenant,
    )


@router.get("/me")
def me(user: Annotated[dict, Depends(get_current_user)]):
    tenant = store.get_tenant(user["tenantId"]) if user.get("tenantId") else None
    return {"user": user, "tenant": tenant}
