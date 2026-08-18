from datetime import datetime, timezone
from typing import Annotated, Any, Optional

from fastapi import APIRouter, Depends, HTTPException

from app.auth import (
    get_current_user,
    get_effective_tenant_id,
    require_roles,
    require_tenant,
)
from app.schemas import (
    AiAssessmentOutput,
    AiImageQualityCheck,
    ImageQualityCheckRequest,
    ImageQualityCheckResponse,
    SkinAssessmentRequest,
    SpecialistReviewRequest,
    CasePriority,
    CaseStatus,
)
from app.services.ai_service import openai_service
from app.store import store


router = APIRouter(prefix="/ai", tags=["ai"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _collect_image_urls(req: SkinAssessmentRequest) -> list[str]:
    urls: list[str] = []
    for img in req.images:
        if img.url:
            urls.append(img.url)
    for url in req.image_urls or []:
        if url and url not in urls:
            urls.append(url)
    return urls


def _enrich_assessment_timestamps(data: dict[str, Any], model_tag: str) -> dict[str, Any]:
    data["model"] = model_tag
    data["generated_at"] = _now_iso()
    data["disclaimer"] = data.get("disclaimer") or "AI assistance only; specialist confirmation required."
    return data


def _urgency_to_priority(urgency: Optional[str], fallback: str = "routine") -> str:
    if not urgency:
        return fallback
    u = urgency.lower()
    if u == "emergent":
        return "urgent"
    if u == "urgent":
        return "urgent"
    if u == "prompt":
        return "high"
    if u == "routine":
        return "routine"
    return fallback


def run_image_quality_checks_for_case(case_id: str) -> Optional[dict[str, Any]]:
    """Internal helper: run AI image quality checks on all images in a case.

    Updates each image on the case with quality rating/score/issues via OpenAI.
    Writes an audit trail entry for the quality check batch.
    Returns a summary dict: {pass: bool, retake_required: bool, per_image: [...], overall_score: int}
    or None if the case was not found or no images to check.
    """
    if not case_id:
        return None
    case = next((c for c in store.db.get("cases", []) if c.get("id") == case_id), None)
    if not case:
        return None
    images = case.get("images", []) or []
    if not images:
        return None

    required_angles: list[str] = []
    angles_present: set[str] = set()
    for img in images:
        a = img.get("angle")
        if a:
            angles_present.add(a)

    per_image_results: list[dict[str, Any]] = []
    updated_images: list[dict[str, Any]] = []
    any_retake_required = False
    total_score = 0
    checked_count = 0
    image_ids: list[str] = []
    quality_output_for_audit: list[dict[str, Any]] = []
    model_tag_aggregate = ""

    for img in images:
        url = img.get("url")
        img_id = img.get("id")
        if img_id:
            image_ids.append(img_id)
        angle = img.get("angle")
        if not url:
            updated_images.append({**img})
            continue
        try:
            quality_data, model_tag = openai_service.check_image_quality(
                url,
                angle=angle,
                required_angles=list(required_angles),
            )
        except Exception:
            updated_images.append({**img})
            continue
        if not model_tag_aggregate:
            model_tag_aggregate = model_tag
        iq = quality_data.get("image_quality", {})
        rating = iq.get("rating", "acceptable")
        score = int(iq.get("score", 70))
        issues = iq.get("issues", []) or []
        retake_for_this = rating == "poor" or score < 60
        if retake_for_this:
            any_retake_required = True
        total_score += score
        checked_count += 1
        result_entry = {
            "imageId": img_id,
            "url": url,
            "angle": angle,
            "rating": rating,
            "score": score,
            "issues": issues,
            "retakeRequired": retake_for_this,
        }
        per_image_results.append(result_entry)
        quality_output_for_audit.append(result_entry)
        updated_image: dict[str, Any] = {
            **img,
            "quality": rating,
            "qualityScore": score,
            "qualityNotes": "; ".join(issues) if issues else None,
            "aiQualityCheck": {
                "rating": rating,
                "score": score,
                "issues": issues,
                "focus": iq.get("focus", True),
                "lighting": iq.get("lighting", True),
                "lesion_visible": iq.get("lesion_visible", True),
                "required_angles_present": iq.get("required_angles_present", True),
                "model": model_tag,
                "checkedAt": _now_iso(),
                "retakeRequired": retake_for_this,
            },
        }
        updated_images.append(updated_image)

    overall_score = int(total_score / checked_count) if checked_count > 0 else 70
    all_ok = not any_retake_required and overall_score >= 60
    summary = {
        "pass": all_ok,
        "retake_required": any_retake_required,
        "overall_score": overall_score,
        "checked_images": checked_count,
        "total_images": len(images),
        "per_image": per_image_results,
    }

    patch: dict[str, Any] = {"images": updated_images}
    if any_retake_required:
        patch["imageQualityStatus"] = "retake_required"
        patch["aiImageQuality"] = summary
    elif checked_count > 0:
        patch["imageQualityStatus"] = "passed"
        patch["aiImageQuality"] = summary
    else:
        patch["imageQualityStatus"] = "unchecked"
        patch["aiImageQuality"] = summary

    store.update_case(case_id, patch)

    if checked_count > 0:
        store.add_ai_audit_trail({
            "caseId": case_id,
            "requestType": "image_quality_check",
            "aiModel": model_tag_aggregate or openai_service.model,
            "requestTimestamp": _now_iso(),
            "imageIds": image_ids,
            "clinicalInput": {
                "required_angles": required_angles,
                "angles_present": list(angles_present),
            },
            "clinicalInputVersion": "1.0",
            "aiOutput": {"summary": summary, "perImage": quality_output_for_audit},
        })

    return summary


def run_ai_assessment_for_case(case_id: str, clinical_input: dict[str, Any], image_urls: list[str]) -> Optional[dict[str, Any]]:
    """Internal helper: run AI image quality check FIRST, then conditionally run AI skin
    assessment, save results to the case, and write the audit trail.

    Used by the /ai/skin-assessment endpoint and by auto-triggers in case creation flows.
    Returns the enriched AI output dict, or None if quality check blocked assessment or
    nothing was saved for any reason.
    """
    if not case_id:
        return None
    case = next((c for c in store.db.get("cases", []) if c.get("id") == case_id), None)
    if not case:
        return None

    quality_summary = run_image_quality_checks_for_case(case_id)
    if quality_summary and not quality_summary.get("pass", True):
        current_status = case.get("status", "new")
        new_status = "in_review" if current_status in ("new", None) else current_status
        store.update_case(case_id, {
            "status": new_status,
        })
        return None

    try:
        assessment, model_tag = openai_service.assess_skin(clinical_input, image_urls)
    except Exception:
        return None
    enriched = _enrich_assessment_timestamps(assessment, model_tag)
    new_priority = _urgency_to_priority(enriched.get("urgency"), case.get("priority", "routine"))
    current_status = case.get("status", "new")
    new_status = "in_review" if current_status in ("new", None) else current_status
    image_ids = [img.get("id") for img in case.get("images", []) if img.get("id")]
    store.update_case(case_id, {
        "ai": enriched,
        "priority": new_priority,
        "status": new_status,
    })
    store.add_ai_audit_trail({
        "caseId": case_id,
        "requestType": "skin_assessment",
        "aiModel": model_tag,
        "requestTimestamp": _now_iso(),
        "imageIds": image_ids,
        "clinicalInput": clinical_input,
        "clinicalInputVersion": "1.0",
        "aiOutput": enriched,
    })
    return enriched


@router.post("/image-quality-check", response_model=ImageQualityCheckResponse)
def image_quality_check(
    body: ImageQualityCheckRequest,
    user: Annotated[dict, Depends(get_current_user)],
):
    if not body.image_url:
        raise HTTPException(status_code=400, detail="image_url is required")

    quality_data, model_tag = openai_service.check_image_quality(
        body.image_url,
        angle=body.angle,
        required_angles=body.required_angles,
    )

    enriched = quality_data
    enriched.setdefault("image_quality", {})
    enriched["image_quality"]["required_angles_present"] = (
        enriched["image_quality"].get("required_angles_present", True)
        if not body.required_angles
        else True
    )

    retake = enriched["image_quality"].get("rating") == "poor" or enriched["image_quality"].get("score", 100) < 60

    resp = {
        **enriched,
        "model": model_tag,
        "generated_at": _now_iso(),
        "retake_required": retake,
    }
    return resp


@router.post("/skin-assessment", response_model=AiAssessmentOutput)
def skin_assessment(
    body: SkinAssessmentRequest,
    user: Annotated[dict, Depends(get_current_user)],
    tenant_id: Annotated[Optional[str], Depends(get_effective_tenant_id)],
):
    image_urls = _collect_image_urls(body)

    clinical_input: dict[str, Any] = {
        "patient_age": body.patient_age,
        "sex": body.sex,
        "symptoms": body.symptoms,
        "duration": body.duration,
        "duration_days": body.duration_days,
        "body_site": body.body_site,
        "severity": body.severity,
        "previous_treatment": body.previous_treatment,
        "treatment_response": body.treatment_response,
        "adherence": body.adherence,
        "red_flags": body.red_flags,
        "primary_concern": body.primary_concern,
        "clinical_info": body.clinical_info,
    }

    if body.case_id:
        case = next((c for c in store.db.get("cases", []) if c.get("id") == body.case_id), None)
        if case and (tenant_id is None or case.get("tenantId") == tenant_id):
            saved = run_ai_assessment_for_case(body.case_id, clinical_input, image_urls)
            if saved:
                return saved

    assessment, model_tag = openai_service.assess_skin(clinical_input, image_urls)
    return _enrich_assessment_timestamps(assessment, model_tag)


@router.post("/specialist-review")
def specialist_review(
    body: SpecialistReviewRequest,
    user: Annotated[dict, Depends(get_current_user)],
    _roles_ok: Annotated[None, Depends(require_roles(["specialist", "org_admin", "platform_admin"]))],
):
    case = next((c for c in store.db.get("cases", []) if c.get("id") == body.case_id), None)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    now = _now_iso()
    treatment_plan = body.treatment_plan or {
        "finalAssessment": body.final_assessment,
        "finalCondition": body.final_condition,
        "clinicalAction": body.clinical_action,
        "treatmentGuidance": body.treatment_guidance,
        "followUpPeriodWeeks": body.follow_up_period_weeks,
        "specialistNotes": body.specialist_notes,
        "specialistId": user["id"],
        "specialistName": user.get("name", "Specialist"),
        "confirmedAiAssessment": body.confirms_ai_assessment,
        "partialEndorsement": body.partial_endorsement,
        "issuedAt": now,
    }

    status_map = {
        "discharge": "closed",
        "continue_regimen": "reviewed",
        "adjust_regimen": "reviewed",
        "escalate_in_person": "reviewed",
    }
    new_status: CaseStatus = status_map.get(body.clinical_action, "reviewed")

    new_priority: CasePriority = case.get("priority", "routine")
    if body.clinical_action == "escalate_in_person":
        new_priority = "urgent"

    updated = store.update_case(body.case_id, {
        "status": new_status,
        "priority": new_priority,
        "specialistId": user["id"],
        "suspectedCondition": body.final_condition or case.get("suspectedCondition"),
        "treatmentPlan": treatment_plan,
    })

    specialist_review_record = {
        "caseId": body.case_id,
        "finalAssessment": body.final_assessment,
        "finalCondition": body.final_condition,
        "clinicalAction": body.clinical_action,
        "treatmentGuidance": body.treatment_guidance,
        "followUpPeriodWeeks": body.follow_up_period_weeks,
        "specialistNotes": body.specialist_notes,
        "confirmsAiAssessment": body.confirms_ai_assessment,
        "partialEndorsement": body.partial_endorsement,
        "specialistId": user["id"],
        "specialistName": user.get("name"),
    }
    review_entry = store.add_specialist_review(specialist_review_record, specialist_id=user["id"])

    if body.follow_up_period_weeks and body.follow_up_period_weeks > 0:
        patient = next((p for p in store.db.get("patients", []) if p.get("id") == case.get("patientId")), None)
        tenant_id = case.get("tenantId") or user.get("tenantId")
        if tenant_id:
            from datetime import timedelta
            try:
                base = datetime.now(timezone.utc)
                scheduled = base + timedelta(weeks=body.follow_up_period_weeks)
                store.add_follow_up(tenant_id, {
                    "caseId": body.case_id,
                    "caseRef": case.get("ref"),
                    "patientName": patient.get("fullName", "Patient") if patient else "Patient",
                    "scheduledFor": scheduled.isoformat(),
                    "purpose": f"Follow-up after specialist action: {body.clinical_action}",
                    "status": "scheduled",
                })
            except Exception:
                pass

    return {
        "case": updated,
        "review": review_entry,
    }


@router.get("/cases/{case_id}/audit-trail")
def case_audit_trail(
    case_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    tenant_id: Annotated[Optional[str], Depends(get_effective_tenant_id)],
):
    case = next((c for c in store.db.get("cases", []) if c.get("id") == case_id), None)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if tenant_id is not None and case.get("tenantId") != tenant_id and user.get("role") != "platform_admin":
        raise HTTPException(status_code=403, detail="Access denied")

    ai_trail = store.list_ai_audit_trail(case_id=case_id)
    specialist_reviews = store.list_specialist_reviews(case_id=case_id)
    return {
        "caseId": case_id,
        "aiAssessments": ai_trail,
        "specialistDecisions": specialist_reviews,
        "caseTimeline": {
            "createdAt": case.get("createdAt"),
            "updatedAt": case.get("updatedAt"),
            "status": case.get("status"),
        },
    }


@router.get("/health")
def ai_health(user: Annotated[dict, Depends(get_current_user)]):
    return {
        "configured": openai_service.is_configured,
        "model": openai_service.model,
        "has_key": bool(openai_service.api_key),
        "status": "ready" if openai_service.is_configured else "fallback-only",
    }
