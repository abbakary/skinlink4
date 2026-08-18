from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user, get_effective_tenant_id, require_platform_admin
from app.schemas import TenantCreate, TenantUpdate, UserCreate, UserUpdate
from app.store import store

router = APIRouter(tags=["admin"])


@router.get("/tenants")
def list_tenants(user: Annotated[dict, Depends(get_current_user)]):
    if user["role"] == "platform_admin":
        return store.scope(None, "tenants")
    tenant_id = user.get("tenantId")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No organization")
    tenant = store.get_tenant(tenant_id)
    return [tenant] if tenant else []


@router.post("/tenants")
def create_tenant(body: TenantCreate, _: Annotated[dict, Depends(require_platform_admin)]):
    existing = store.get_user_by_email(body.adminEmail)
    if existing:
        raise HTTPException(status_code=400, detail="Admin email already in use")
    tenant, admin = store.create_tenant_account(body.model_dump())
    return {"tenant": tenant, "admin": admin}


@router.patch("/tenants/{tenant_id}")
def update_tenant(
    tenant_id: str,
    body: TenantUpdate,
    user: Annotated[dict, Depends(get_current_user)],
):
    if user["role"] != "platform_admin" and user.get("tenantId") != tenant_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    updated = store.update_tenant(tenant_id, patch)
    if not updated:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return updated


@router.get("/users")
def list_users(
    user: Annotated[dict, Depends(get_current_user)],
    tenant_id: Annotated[str | None, Depends(get_effective_tenant_id)],
):
    if user["role"] == "platform_admin" and not tenant_id:
        return store.list_users(None)
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Select a tenant")
    return store.list_users(tenant_id)


@router.post("/users")
def create_user(body: UserCreate, user: Annotated[dict, Depends(get_current_user)]):
    if user["role"] not in ("platform_admin", "org_admin"):
        raise HTTPException(status_code=403, detail="Not allowed")
    if user["role"] == "org_admin" and user.get("tenantId") != body.tenantId:
        raise HTTPException(status_code=403, detail="Not allowed")
    if store.get_user_by_email(body.email):
        raise HTTPException(status_code=400, detail="Email already in use")
    return store.add_user(body.model_dump(exclude={"password"}), body.password)


@router.patch("/users/{user_id}")
def update_user(
    user_id: str,
    body: UserUpdate,
    user: Annotated[dict, Depends(get_current_user)],
):
    target = store.get_user(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if user["role"] == "org_admin" and user.get("tenantId") != target.get("tenantId"):
        raise HTTPException(status_code=403, detail="Not allowed")
    if user["role"] not in ("platform_admin", "org_admin") and user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    updated = store.update_user(user_id, patch)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated
