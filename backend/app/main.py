import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import admin, ai, auth, cases, drafts, followups, patients, referrals, resources

app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.include_router(auth.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(patients.router, prefix="/api/v1")
app.include_router(cases.router, prefix="/api/v1")
app.include_router(referrals.router, prefix="/api/v1")
app.include_router(followups.router, prefix="/api/v1")
app.include_router(resources.router, prefix="/api/v1")
app.include_router(drafts.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "service": settings.app_name}
