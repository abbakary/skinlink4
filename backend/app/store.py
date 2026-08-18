"""JSON file-backed database mirroring the Next.js data-store contract."""

from __future__ import annotations

import json
import os
import threading
import uuid
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Optional

from passlib.context import CryptContext

from app.config import settings
from app.seed import build_seed, DEMO_ORG_PASSWORD, DEMO_PLATFORM_PASSWORD

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_lock = threading.Lock()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


class DatabaseStore:
    def __init__(self) -> None:
        self.path = settings.database_path
        self.credentials: dict[str, str] = {}
        self.drafts: dict[str, list[dict[str, Any]]] = {}
        self._load()

    def _load(self) -> None:
        os.makedirs(os.path.dirname(self.path) or ".", exist_ok=True)
        if os.path.exists(self.path):
            with open(self.path, encoding="utf-8") as f:
                payload = json.load(f)
            self.db = payload.get("db", build_seed())
            self.credentials = payload.get("credentials", {})
            self.drafts = payload.get("drafts", {})
            if "aiAuditTrail" not in self.db:
                self.db["aiAuditTrail"] = []
            if "specialistReviews" not in self.db:
                self.db["specialistReviews"] = []
        else:
            self.db = build_seed()
            if "aiAuditTrail" not in self.db:
                self.db["aiAuditTrail"] = []
            if "specialistReviews" not in self.db:
                self.db["specialistReviews"] = []
            self._build_credentials()
            self.save()

    def _build_credentials(self) -> None:
        self.credentials = {}
        for u in self.db["users"]:
            pwd = DEMO_PLATFORM_PASSWORD if u["role"] == "platform_admin" else DEMO_ORG_PASSWORD
            self.credentials[u["email"].lower()] = pwd

    def save(self) -> None:
        os.makedirs(os.path.dirname(self.path) or ".", exist_ok=True)
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump({"db": self.db, "credentials": self.credentials, "drafts": self.drafts}, f, indent=2)

    def verify_password(self, email: str, password: str) -> bool:
        return self.credentials.get(email.lower()) == password

    def get_user_by_email(self, email: str) -> Optional[dict[str, Any]]:
        return next((u for u in self.db["users"] if u["email"].lower() == email.lower()), None)

    def get_user(self, user_id: str) -> Optional[dict[str, Any]]:
        return next((u for u in self.db["users"] if u["id"] == user_id), None)

    def get_tenant(self, tenant_id: str) -> Optional[dict[str, Any]]:
        return next((t for t in self.db["tenants"] if t["id"] == tenant_id), None)

    def scope(self, tenant_id: Optional[str], collection: str) -> list[dict[str, Any]]:
        items = self.db.get(collection, [])
        if tenant_id is None:
            return deepcopy(items)
        return deepcopy([i for i in items if i.get("tenantId") == tenant_id])

    def next_patient_code(self, tenant_id: str) -> str:
        codes = [p["code"] for p in self.db["patients"] if p["tenantId"] == tenant_id]
        nums = []
        for c in codes:
            try:
                nums.append(int(c.split("-")[-1]))
            except ValueError:
                pass
        n = max(nums, default=0) + 1
        return f"PT-{n:04d}"

    def add_patient(self, tenant_id: str, data: dict[str, Any], registered_by: str) -> dict[str, Any]:
        patient = {
            "id": _uid("p"),
            "tenantId": tenant_id,
            "code": self.next_patient_code(tenant_id),
            "createdAt": _now_iso(),
            "registeredById": registered_by,
            **data,
        }
        with _lock:
            self.db["patients"].insert(0, patient)
            self.save()
        return deepcopy(patient)

    def update_patient(self, patient_id: str, patch: dict[str, Any]) -> Optional[dict[str, Any]]:
        with _lock:
            for i, p in enumerate(self.db["patients"]):
                if p["id"] == patient_id:
                    self.db["patients"][i] = {**p, **patch}
                    self.save()
                    return deepcopy(self.db["patients"][i])
        return None

    def add_case(self, tenant_id: str, data: dict[str, Any], clinician_id: str) -> dict[str, Any]:
        ref = data.get("ref") or f"REF-{datetime.now().year}-{1000 + len(self.db['cases'])}"
        iso = _now_iso()
        images = []
        for idx, img in enumerate(data.get("images", [])):
            images.append({
                "id": _uid("img"),
                "url": img["url"],
                "angle": img.get("angle", "Overview"),
                "quality": img.get("quality", "good"),
                "qualityScore": img.get("qualityScore", 85),
                "qualityNotes": img.get("qualityNotes"),
                "capturedAt": img.get("capturedAt", iso),
            })
        case = {
            "id": _uid("c"),
            "tenantId": tenant_id,
            "ref": ref,
            "patientId": data["patientId"],
            "clinicianId": clinician_id,
            "specialistId": data.get("specialistId"),
            "primaryConcern": data["primaryConcern"],
            "clinicalInfo": data.get("clinicalInfo", data["primaryConcern"]),
            "durationDays": data["durationDays"],
            "suspectedCondition": data.get("suspectedCondition", "Awaiting specialist review"),
            "status": data.get("status", "new"),
            "priority": data.get("priority", "routine"),
            "images": images,
            "notes": [],
            "createdAt": iso,
            "updatedAt": iso,
            "bodySite": data.get("bodySite"),
            "previousTreatment": data.get("previousTreatment"),
            "redFlags": data.get("redFlags", []),
        }
        if data.get("treatmentPlan"):
            case["treatmentPlan"] = data["treatmentPlan"]
        with _lock:
            self.db["cases"].insert(0, case)
            self.save()
        return deepcopy(case)

    def update_case(self, case_id: str, patch: dict[str, Any]) -> Optional[dict[str, Any]]:
        with _lock:
            for i, c in enumerate(self.db["cases"]):
                if c["id"] == case_id:
                    updated = {**c, **patch, "updatedAt": _now_iso()}
                    self.db["cases"][i] = updated
                    self.save()
                    return deepcopy(updated)
        return None

    def add_case_note(self, case_id: str, author: dict[str, Any], body: str) -> Optional[dict[str, Any]]:
        note = {
            "id": _uid("n"),
            "authorId": author["id"],
            "authorName": author["name"],
            "body": body,
            "createdAt": _now_iso(),
        }
        with _lock:
            for i, c in enumerate(self.db["cases"]):
                if c["id"] == case_id:
                    notes = list(c.get("notes", []))
                    notes.append(note)
                    self.db["cases"][i] = {**c, "notes": notes, "updatedAt": _now_iso()}
                    self.save()
                    return deepcopy(self.db["cases"][i])
        return None

    def add_referral(self, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
        referral = {
            "id": _uid("r"),
            "tenantId": tenant_id,
            "createdAt": _now_iso(),
            **data,
        }
        with _lock:
            self.db["referrals"].insert(0, referral)
            self.save()
        return deepcopy(referral)

    def add_follow_up(self, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
        follow_up = {"id": _uid("f"), "tenantId": tenant_id, **data}
        with _lock:
            self.db["followUps"].insert(0, follow_up)
            self.save()
        return deepcopy(follow_up)

    def update_follow_up(self, follow_up_id: str, patch: dict[str, Any]) -> Optional[dict[str, Any]]:
        with _lock:
            for i, f in enumerate(self.db["followUps"]):
                if f["id"] == follow_up_id:
                    self.db["followUps"][i] = {**f, **patch}
                    self.save()
                    return deepcopy(self.db["followUps"][i])
        return None

    def update_referral(self, referral_id: str, patch: dict[str, Any]) -> Optional[dict[str, Any]]:
        with _lock:
            for i, r in enumerate(self.db["referrals"]):
                if r["id"] == referral_id:
                    self.db["referrals"][i] = {**r, **patch}
                    self.save()
                    return deepcopy(self.db["referrals"][i])
        return None

    def add_resource(self, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
        resource = {
            "id": _uid("res"),
            "tenantId": tenant_id,
            "updatedAt": _now_iso(),
            **data,
        }
        with _lock:
            self.db["resources"].insert(0, resource)
            self.save()
        return deepcopy(resource)

    def add_tenant(self, data: dict[str, Any]) -> dict[str, Any]:
        tenant = {
            "id": _uid("t"),
            "usedSeats": 0,
            "createdAt": _now_iso(),
            **data,
        }
        with _lock:
            self.db["tenants"].insert(0, tenant)
            self.save()
        return deepcopy(tenant)

    def update_tenant(self, tenant_id: str, patch: dict[str, Any]) -> Optional[dict[str, Any]]:
        with _lock:
            for i, t in enumerate(self.db["tenants"]):
                if t["id"] == tenant_id:
                    self.db["tenants"][i] = {**t, **patch}
                    self.save()
                    return deepcopy(self.db["tenants"][i])
        return None

    def create_tenant_account(self, data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
        slug = (
            data["name"]
            .lower()
            .replace(" ", "-")
            .replace("_", "-")
        )
        slug = "".join(c for c in slug if c.isalnum() or c == "-").strip("-")[:40]
        tenant = self.add_tenant({
            "name": data["name"],
            "slug": slug,
            "plan": data.get("plan", "pilot"),
            "status": "active",
            "country": data["country"],
            "region": data["region"],
            "contactName": data["adminName"],
            "contactEmail": data["adminEmail"],
            "seats": data.get("seats", 10),
            "clinics": data.get("clinics", 1),
            "primaryColor": data.get("primaryColor") or "#1f7a8c",
        })
        admin = self.add_user({
            "tenantId": tenant["id"],
            "name": data["adminName"],
            "email": data["adminEmail"],
            "role": "org_admin",
            "title": data.get("adminTitle") or "Organization Administrator",
            "phone": data.get("adminPhone"),
            "status": "active",
            "avatarColor": data.get("primaryColor") or "#1f7a8c",
        }, data["adminPassword"])
        self.update_tenant(tenant["id"], {"usedSeats": 1})
        tenant = self.get_tenant(tenant["id"]) or tenant
        return tenant, admin

    def add_user(self, data: dict[str, Any], password: str) -> dict[str, Any]:
        iso = _now_iso()
        user = {
            "id": _uid("u"),
            "createdAt": iso,
            "lastActive": iso,
            **data,
        }
        with _lock:
            self.db["users"].insert(0, user)
            self.credentials[user["email"].lower()] = password
            tenant_id = user.get("tenantId")
            if tenant_id:
                for i, t in enumerate(self.db["tenants"]):
                    if t["id"] == tenant_id:
                        self.db["tenants"][i] = {**t, "usedSeats": t.get("usedSeats", 0) + 1}
                        break
            self.save()
        return deepcopy(user)

    def update_user(self, user_id: str, patch: dict[str, Any]) -> Optional[dict[str, Any]]:
        with _lock:
            for i, u in enumerate(self.db["users"]):
                if u["id"] == user_id:
                    self.db["users"][i] = {**u, **patch, "lastActive": _now_iso()}
                    self.save()
                    return deepcopy(self.db["users"][i])
        return None

    def list_users(self, tenant_id: Optional[str]) -> list[dict[str, Any]]:
        users = self.db.get("users", [])
        if tenant_id is None:
            return deepcopy(users)
        return deepcopy([u for u in users if u.get("tenantId") == tenant_id])

    def get_drafts(self, user_id: str) -> list[dict[str, Any]]:
        return deepcopy(self.drafts.get(user_id, []))

    def save_draft(self, user_id: str, draft: dict[str, Any]) -> dict[str, Any]:
        drafts = self.drafts.setdefault(user_id, [])
        draft = {**draft, "updatedAt": _now_iso()}
        for i, d in enumerate(drafts):
            if d["id"] == draft["id"]:
                drafts[i] = draft
                break
        else:
            drafts.insert(0, draft)
        with _lock:
            self.save()
        return deepcopy(draft)

    def delete_draft(self, user_id: str, draft_id: str) -> None:
        self.drafts[user_id] = [d for d in self.drafts.get(user_id, []) if d["id"] != draft_id]
        with _lock:
            self.save()

    def add_ai_audit_trail(self, data: dict[str, Any]) -> dict[str, Any]:
        entry = {
            "id": _uid("ai"),
            "createdAt": _now_iso(),
            **data,
        }
        with _lock:
            self.db.setdefault("aiAuditTrail", []).insert(0, entry)
            self.save()
        return deepcopy(entry)

    def list_ai_audit_trail(self, case_id: Optional[str] = None, tenant_id: Optional[str] = None) -> list[dict[str, Any]]:
        items = self.db.get("aiAuditTrail", [])
        if case_id:
            items = [i for i in items if i.get("caseId") == case_id]
        if tenant_id:
            case_ids = {c["id"] for c in self.db.get("cases", []) if c.get("tenantId") == tenant_id}
            items = [i for i in items if i.get("caseId") in case_ids]
        return deepcopy(items)

    def add_specialist_review(self, data: dict[str, Any], specialist_id: str) -> dict[str, Any]:
        entry = {
            "id": _uid("sr"),
            "specialistId": specialist_id,
            "finalDecisionTimestamp": _now_iso(),
            **data,
        }
        with _lock:
            self.db.setdefault("specialistReviews", []).insert(0, entry)
            self.save()
        return deepcopy(entry)

    def list_specialist_reviews(self, case_id: Optional[str] = None) -> list[dict[str, Any]]:
        items = self.db.get("specialistReviews", [])
        if case_id:
            items = [i for i in items if i.get("caseId") == case_id]
        return deepcopy(items)


store = DatabaseStore()
