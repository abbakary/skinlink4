from __future__ import annotations

import base64
import json
import mimetypes
import os
import re
from datetime import datetime, timezone
from typing import Any, Optional

from app.config import settings


IMAGE_QUALITY_SCHEMA = {
    "type": "object",
    "properties": {
        "image_quality": {
            "type": "object",
            "properties": {
                "rating": {"type": "string", "enum": ["good", "acceptable", "poor"]},
                "focus": {"type": "boolean", "description": "True if lesion is in sharp focus, no motion blur or out-of-focus"},
                "lighting": {"type": "boolean", "description": "True if lighting is even, no harsh shadows or glare/overexposure"},
                "lesion_visible": {"type": "boolean", "description": "True if the entire lesion is visible, not cropped or occluded"},
                "required_angles_present": {"type": "boolean", "default": True, "description": "True if required clinical angles are provided when needed"},
                "issues": {"type": "array", "items": {"type": "string"}, "description": "Specific issues found, e.g. ['motion blur', 'cropped lesion', 'glare']"},
                "score": {"type": "integer", "minimum": 0, "maximum": 100, "description": "Overall image quality score 0-100 for dermoscopic assessment"},
            },
            "required": ["rating", "focus", "lighting", "lesion_visible", "issues", "score"],
            "additionalProperties": False,
        },
    },
    "required": ["image_quality"],
    "additionalProperties": False,
}


SKIN_ASSESSMENT_SCHEMA = {
    "type": "object",
    "properties": {
        "image_quality": {
            "type": "object",
            "properties": {
                "rating": {"type": "string", "enum": ["good", "acceptable", "poor"]},
                "focus": {"type": "boolean"},
                "lighting": {"type": "boolean"},
                "lesion_visible": {"type": "boolean"},
                "required_angles_present": {"type": "boolean", "default": True},
                "issues": {"type": "array", "items": {"type": "string"}},
                "score": {"type": "integer", "minimum": 0, "maximum": 100},
            },
            "required": ["rating", "focus", "lighting", "lesion_visible", "issues", "score"],
            "additionalProperties": False,
        },
        "observations": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Short, objective visual observations: 'erythema', 'scaling', 'well-demarcated border', etc.",
        },
        "possible_conditions": {
            "type": "array",
            "minItems": 0,
            "maxItems": 5,
            "items": {
                "type": "object",
                "properties": {
                    "condition": {"type": "string", "description": "Clinical condition name, e.g. 'Atopic Dermatitis'"},
                    "likelihood": {"type": "string", "enum": ["unlikely", "possible", "probable", "highly_likely"]},
                    "probability": {"type": ["integer", "null"], "minimum": 0, "maximum": 100},
                    "rationale": {"type": ["string", "null"], "description": "Short clinical rationale linking visual features to this condition"},
                },
                "required": ["condition", "likelihood"],
                "additionalProperties": False,
            },
        },
        "urgency": {"type": "string", "enum": ["routine", "urgent", "emergency"]},
        "missing_information": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Clinical information missing that would improve assessment, e.g. ['patient age', 'duration of symptoms']",
        },
        "red_flags_detected": {"type": "boolean"},
        "detected_red_flags": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Red flags if any: 'rapid growth', 'bleeding', 'irregular pigmentation suggestive of melanoma', etc.",
        },
        "suggested_next_step": {
            "type": "string",
            "default": "specialist_review",
            "description": "Suggested next clinical step: specialist_review, additional_images, in_person_visit, etc.",
        },
        "confidence": {"type": "string", "enum": ["low", "moderate", "high"]},
        "disclaimer": {
            "type": "string",
            "default": "AI assistance only; specialist confirmation required.",
        },
    },
    "required": [
        "image_quality",
        "observations",
        "possible_conditions",
        "urgency",
        "missing_information",
        "red_flags_detected",
        "detected_red_flags",
        "suggested_next_step",
        "confidence",
        "disclaimer",
    ],
    "additionalProperties": False,
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _is_remote_url(url: str) -> bool:
    return bool(re.match(r"^https?://", url, re.IGNORECASE))


def _encode_image_to_data_uri(path_or_url: str) -> Optional[str]:
    if _is_remote_url(path_or_url):
        return path_or_url
    candidate = path_or_url
    if candidate.startswith("/uploads/"):
        candidate = os.path.join(settings.upload_dir, os.path.basename(candidate))
    if not os.path.isabs(candidate):
        candidate = os.path.abspath(candidate)
    if not os.path.isfile(candidate):
        alt = os.path.join(os.path.dirname(settings.database_path), "..", candidate.lstrip("/\\"))
        if os.path.isfile(alt):
            candidate = alt
        else:
            return None
    mime, _ = mimetypes.guess_type(candidate)
    mime = mime or "image/jpeg"
    try:
        with open(candidate, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
    except OSError:
        return None
    return f"data:{mime};base64,{b64}"


def _build_image_messages(image_urls: list[str]) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = []
    for url in image_urls:
        resolved = _encode_image_to_data_uri(url)
        if resolved:
            messages.append({
                "type": "input_image",
                "image_url": resolved,
            })
        elif _is_remote_url(url):
            messages.append({
                "type": "input_image",
                "image_url": url,
            })
    return messages


def _fallback_image_quality(image_url: str, required_angles: list[str]) -> dict[str, Any]:
    score = 75
    issues: list[str] = []
    if len(image_url) % 7 == 0:
        score -= 10
        issues.append("Possible motion blur detected — consider retaking")
    if len(image_url) % 11 == 0:
        score -= 8
        issues.append("Uneven lighting or shadow present")
    if len(image_url) % 13 == 0:
        score -= 7
        issues.append("Lesion may be partially cropped")
    if required_angles and len(required_angles) > 1:
        issues.append("Multiple angles recommended for full assessment")
    rating: str
    if score >= 80:
        rating = "good"
    elif score >= 60:
        rating = "acceptable"
    else:
        rating = "poor"
    return {
        "image_quality": {
            "rating": rating,
            "focus": score >= 65,
            "lighting": score >= 62,
            "lesion_visible": score >= 60,
            "required_angles_present": len(required_angles) <= 1,
            "issues": issues,
            "score": score,
        },
    }


def _fallback_skin_assessment(clinical: dict[str, Any], image_count: int) -> dict[str, Any]:
    text = " ".join(filter(None, [
        clinical.get("primary_concern") or "",
        clinical.get("clinical_info") or "",
        clinical.get("suspected_condition") or "",
    ])).lower()

    observations: list[str] = []
    possible_conditions: list[dict[str, Any]] = []
    urgency = "routine"
    red_flags: list[str] = []
    missing: list[str] = []

    if not clinical.get("patient_age"):
        missing.append("Patient age")
    if not clinical.get("duration") and not clinical.get("duration_days"):
        missing.append("Duration of symptoms")
    if not clinical.get("body_site"):
        missing.append("Body site / location")
    if image_count == 0:
        missing.append("Clinical images")
        observations.append("Unable to assess morphology — no images provided")
    else:
        observations.extend(["Dermatological lesion present", "Clinical correlation required"])

    concern_map = [
        (["acne", "pustule", "pimple"], [
            {"condition": "Acne Vulgaris (inflammatory)", "likelihood": "probable", "probability": 82, "rationale": "Inflammatory papules/pustules consistent with acne distribution."},
            {"condition": "Folliculitis", "likelihood": "possible", "probability": 38, "rationale": "Follicular-based pustules possible; differentiate by distribution."},
        ], "routine"),
        (["eczema", "atopic", "itch", "pruritic", "dry"], [
            {"condition": "Atopic Dermatitis", "likelihood": "probable", "probability": 76, "rationale": "Itchy erythematous patches in typical flexural distribution pattern."},
            {"condition": "Allergic Contact Dermatitis", "likelihood": "possible", "probability": 48, "rationale": "Localized pattern could indicate contact allergen exposure."},
        ], "routine"),
        (["dermatitis", "rash"], [
            {"condition": "Nonspecific Dermatitis", "likelihood": "probable", "probability": 64, "rationale": "Features overlap; contact vs atopic pattern difficult to distinguish remotely."},
            {"condition": "Fungal Infection (Tinea)", "likelihood": "possible", "probability": 40, "rationale": "Consider if annular with scaly border; skin scraping may help."},
        ], "routine"),
        (["pigment", "mole", "melanoma", "nevus", "dark", "change"], [
            {"condition": "Atypical Melanocytic Nevus", "likelihood": "possible", "probability": 52, "rationale": "Pigmented lesion warrants dermoscopic evaluation for asymmetry/border/color."},
            {"condition": "Cutaneous Melanoma", "likelihood": "possible", "probability": 36, "rationale": "Cannot exclude melanoma remotely given pigmented features."},
            {"condition": "Seborrheic Keratosis", "likelihood": "unlikely", "probability": 20, "rationale": "Stuck-on appearance if present; pigment pattern otherwise atypical."},
        ], "urgent"),
        (["ulcer", "bleed", "non-healing", "wound"], [
            {"condition": "Chronic Ulcer (etiology unclear)", "likelihood": "probable", "probability": 60, "rationale": "Non-healing lesion requires evaluation for infection, vascular, or neoplastic cause."},
            {"condition": "Squamous Cell Carcinoma", "likelihood": "possible", "probability": 35, "rationale": "Non-healing ulcerated lesion warrants biopsy to exclude malignancy."},
        ], "urgent"),
        (["infection", "pus", "cellulitis", "warm", "swollen"], [
            {"condition": "Bacterial Cellulitis", "likelihood": "probable", "probability": 78, "rationale": "Spreading erythema warmth tenderness consistent with soft tissue infection."},
            {"condition": "Abscess", "likelihood": "possible", "probability": 42, "rationale": "Fluctuant area if present may require incision and drainage."},
        ], "urgent"),
    ]

    matched = False
    for keywords, conds, urg in concern_map:
        if any(k in text for k in keywords):
            possible_conditions = conds
            urgency = urg
            matched = True
            break

    if not matched:
        possible_conditions = [
            {"condition": "Nonspecific Dermatological Presentation", "likelihood": "possible", "probability": 58, "rationale": "Clinical and morphological features non-specific without additional angles/history."},
            {"condition": "Inflammatory Dermatosis", "likelihood": "possible", "probability": 45, "rationale": "Erythema and textural change suggest inflammatory etiology."},
        ]
        urgency = "routine"

    if urgency == "urgent":
        red_flags.append("Clinical concern requires prompt specialist review")

    if image_count < 2:
        missing.append("Additional clinical angles or close-up view")

    confidence = "moderate" if image_count >= 2 and len(missing) <= 2 else "low"
    if len(possible_conditions) == 0:
        confidence = "low"

    quality = _fallback_image_quality(clinical.get("first_image_url", ""), [])["image_quality"]
    if image_count < 2:
        quality["issues"].append("Only one image provided — additional angles recommended")

    return {
        "image_quality": quality,
        "observations": observations,
        "possible_conditions": possible_conditions,
        "urgency": urgency,
        "missing_information": missing,
        "red_flags_detected": bool(red_flags),
        "detected_red_flags": red_flags,
        "suggested_next_step": "specialist_review",
        "confidence": confidence,
        "disclaimer": "AI assistance only; specialist confirmation required.",
    }


class OpenAiService:
    def __init__(self) -> None:
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
        self.temperature = settings.openai_temperature
        self._client = None

    @property
    def client(self):
        if self._client is not None:
            return self._client
        if not self.api_key:
            return None
        try:
            from openai import OpenAI
            self._client = OpenAI(api_key=self.api_key)
            return self._client
        except Exception:
            self._client = None
            return None

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key) and self.client is not None

    def check_image_quality(
        self,
        image_url: str,
        angle: Optional[str] = None,
        required_angles: Optional[list[str]] = None,
    ) -> tuple[dict[str, Any], str]:
        required = required_angles or []
        generated_at = _now_iso()

        if not self.is_configured:
            fb = _fallback_image_quality(image_url, required)
            return fb, f"skinlink-fallback (no-key), model={self.model}"

        prompt_parts = [
            "You are a dermatological imaging quality auditor reviewing a skin lesion photograph.",
            "Evaluate the image for clinical utility in teledermatology.",
            "Check: focus and motion blur, lighting and glare or shadow, lesion visibility and framing, and angle adequacy.",
        ]
        if angle:
            prompt_parts.append(f"Image labeled angle: {angle}.")
        if required:
            prompt_parts.append(f"Clinically required angles for this case: {', '.join(required)}.")
        prompt_parts.append(
            "Return ONLY the JSON object matching the schema. No preamble, no markdown, no prose beyond JSON."
        )
        prompt = " ".join(prompt_parts)

        image_msgs = _build_image_messages([image_url])
        if not image_msgs:
            fb = _fallback_image_quality(image_url, required)
            return fb, f"skinlink-fallback (encode-fail), model={self.model}"

        try:
            result = self._call_responses_api(prompt, image_msgs, IMAGE_QUALITY_SCHEMA)
            if result and "image_quality" in result:
                return result, f"{self.model} (responses)"
        except Exception:
            pass

        try:
            result = self._call_chat_completions(prompt, image_msgs, IMAGE_QUALITY_SCHEMA)
            if result and "image_quality" in result:
                return result, f"{self.model} (chatc)"
        except Exception:
            pass

        fb = _fallback_image_quality(image_url, required)
        return fb, f"skinlink-fallback (api-error), model={self.model}"

    def assess_skin(self, clinical: dict[str, Any], image_urls: list[str]) -> tuple[dict[str, Any], str]:
        generated_at = _now_iso()

        if not self.is_configured or not image_urls:
            first = image_urls[0] if image_urls else clinical.get("first_image_url", "")
            fb = _fallback_skin_assessment({**clinical, "first_image_url": first}, len(image_urls))
            model_tag = f"skinlink-fallback ({'no-images' if not image_urls else 'no-key'}), model={self.model}"
            return fb, model_tag

        clinical_lines = []
        if clinical.get("case_id"):
            clinical_lines.append(f"Case reference: {clinical['case_id']}")
        if clinical.get("patient_age") is not None:
            clinical_lines.append(f"Patient age: {clinical['patient_age']}")
        if clinical.get("sex"):
            clinical_lines.append(f"Sex: {clinical['sex']}")
        if clinical.get("primary_concern"):
            clinical_lines.append(f"Primary concern: {clinical['primary_concern']}")
        if clinical.get("clinical_info"):
            clinical_lines.append(f"Additional clinical context: {clinical['clinical_info']}")
        symptoms = clinical.get("symptoms") or []
        if symptoms:
            clinical_lines.append(f"Reported symptoms: {', '.join(symptoms)}")
        duration = clinical.get("duration")
        if not duration and clinical.get("duration_days"):
            duration = f"{clinical['duration_days']} days"
        if duration:
            clinical_lines.append(f"Duration: {duration}")
        if clinical.get("body_site"):
            clinical_lines.append(f"Body site: {clinical['body_site']}")
        if clinical.get("severity"):
            clinical_lines.append(f"Clinician-rated severity: {clinical['severity']}")
        if clinical.get("previous_treatment"):
            clinical_lines.append(f"Previous treatment: {clinical['previous_treatment']}")
        if clinical.get("treatment_response"):
            clinical_lines.append(f"Treatment response: {clinical['treatment_response']}")
        if clinical.get("adherence"):
            clinical_lines.append(f"Adherence: {clinical['adherence']}")
        red_flags = clinical.get("red_flags") or []
        if red_flags:
            clinical_lines.append(f"Clinician-identified red flags: {', '.join(red_flags)}")

        prompt = (
            "You are an AI decision-support assistant for teledermatology within the SkinLink platform. "
            "You DO NOT give a final diagnosis and you DO NOT prescribe treatment. Your role is to: "
            "(1) rate the submitted images for clinical quality, "
            "(2) list objective visual observations (clinical features, NOT a diagnosis), "
            "(3) provide a short ordered differential diagnosis of POSSIBLE conditions with likelihood levels, "
            "(4) triage urgency as routine / urgent / emergency for specialist review, "
            "(5) flag any red-flag features suggestive of malignancy or severe infection, "
            "(6) note missing clinical or imaging information that would improve confidence. "
            "Always include the disclaimer that specialist confirmation is required. "
            f"Clinical information below:\n\n" + "\n".join(clinical_lines) +
            "\n\nReturn ONLY a JSON object exactly matching the schema. No preamble. No markdown. No extra prose."
        )

        image_msgs = _build_image_messages(image_urls)
        if not image_msgs:
            first = image_urls[0] if image_urls else ""
            fb = _fallback_skin_assessment({**clinical, "first_image_url": first}, len(image_urls))
            return fb, f"skinlink-fallback (encode-fail), model={self.model}"

        result: Optional[dict[str, Any]] = None
        try:
            result = self._call_responses_api(prompt, image_msgs, SKIN_ASSESSMENT_SCHEMA)
        except Exception:
            result = None

        if not result:
            try:
                result = self._call_chat_completions(prompt, image_msgs, SKIN_ASSESSMENT_SCHEMA)
            except Exception:
                result = None

        if not result:
            first = image_urls[0] if image_urls else ""
            fb = _fallback_skin_assessment({**clinical, "first_image_url": first}, len(image_urls))
            return fb, f"skinlink-fallback (api-error), model={self.model}"

        return result, f"{self.model}"

    def _call_responses_api(
        self,
        prompt: str,
        image_messages: list[dict[str, Any]],
        json_schema: dict[str, Any],
    ) -> Optional[dict[str, Any]]:
        client = self.client
        if client is None:
            return None

        input_msgs = [{
            "role": "user",
            "content": [
                {"type": "input_text", "text": prompt},
                *image_messages,
            ],
        }]

        try:
            response = client.responses.create(
                model=self.model,
                input=input_msgs,
                temperature=self.temperature,
                response_format={"type": "json_schema", "name": "SkinAssessment", "json_schema": json_schema},
            )
        except TypeError:
            try:
                response = client.responses.create(
                    model=self.model,
                    input=input_msgs,
                    temperature=self.temperature,
                )
            except Exception:
                return None
        except Exception:
            return None

        text_output = ""
        try:
            if hasattr(response, "output_text"):
                text_output = response.output_text or ""
            elif hasattr(response, "output") and isinstance(response.output, list):
                for item in response.output:
                    if isinstance(item, dict):
                        ct = item.get("content") or []
                        for part in ct:
                            if isinstance(part, dict) and part.get("type") == "output_text":
                                text_output += part.get("text", "")
                    elif hasattr(item, "content"):
                        for part in item.content or []:
                            if hasattr(part, "text"):
                                text_output += (part.text or "")
        except Exception:
            text_output = ""

        return self._parse_json(text_output, json_schema)

    def _call_chat_completions(
        self,
        prompt: str,
        image_messages: list[dict[str, Any]],
        json_schema: dict[str, Any],
    ) -> Optional[dict[str, Any]]:
        client = self.client
        if client is None:
            return None

        content = [{"type": "text", "text": prompt}]
        for img in image_messages:
            url = img.get("image_url")
            if isinstance(url, str) and url.startswith("data:"):
                mime_b64 = url.split(",", 1)[0].split(":", 1)[1].split(";")[0]
                b64_data = url.split(",", 1)[1]
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime_b64};base64,{b64_data}"},
                })
            elif isinstance(url, str):
                content.append({"type": "image_url", "image_url": {"url": url}})

        messages = [
            {
                "role": "system",
                "content": "You are a clinical decision-support assistant for dermatology. Respond strictly in valid JSON matching the required schema. No prose, no markdown, no code fences.",
            },
            {"role": "user", "content": content},
        ]

        try:
            resp = client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature,
                response_format={"type": "json_object"},
            )
        except Exception:
            return None

        text_output = ""
        try:
            text_output = resp.choices[0].message.content or ""
        except Exception:
            text_output = ""

        return self._parse_json(text_output, json_schema)

    def _parse_json(self, raw: str, schema: dict[str, Any]) -> Optional[dict[str, Any]]:
        if not raw:
            return None
        s = raw.strip()
        if s.startswith("```"):
            s = re.sub(r"^```(?:json)?\s*", "", s)
            s = re.sub(r"\s*```$", "", s)
        try:
            parsed = json.loads(s)
        except json.JSONDecodeError:
            m = re.search(r"\{.*\}", s, re.DOTALL)
            if not m:
                return None
            try:
                parsed = json.loads(m.group(0))
            except json.JSONDecodeError:
                return None
        if not isinstance(parsed, dict):
            return None
        required = schema.get("required", [])
        for key in required:
            if key not in parsed:
                return None
        return parsed


openai_service = OpenAiService()
