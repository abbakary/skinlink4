"""Seed data aligned with lib/seed-data.ts in the Next.js app."""

from datetime import datetime, timezone, timedelta

DEMO_PLATFORM_PASSWORD = "platform123"
DEMO_ORG_PASSWORD = "clinic123"

_now = datetime.now(timezone.utc)


def hours_ago(h: float) -> str:
    return (_now - timedelta(hours=h)).isoformat()


def days_ago(d: int) -> str:
    return (_now - timedelta(days=d)).isoformat()


def days_ahead(d: int) -> str:
    return (_now + timedelta(days=d)).isoformat()


def build_seed() -> dict:
    return {
        "tenants": [
            {
                "id": "t_mwanza",
                "name": "Mwanza Regional Health Network",
                "slug": "mwanza-health",
                "plan": "growth",
                "status": "active",
                "country": "Tanzania",
                "region": "Mwanza",
                "contactName": "Dr. Amina Hassan",
                "contactEmail": "amina@mwanzahealth.org",
                "seats": 25,
                "usedSeats": 14,
                "clinics": 8,
                "createdAt": days_ago(210),
                "primaryColor": "#1f7a8c",
            },
            {
                "id": "t_mtwara",
                "name": "Mtwara Coastal Clinics",
                "slug": "mtwara-coastal",
                "plan": "pilot",
                "status": "trial",
                "country": "Tanzania",
                "region": "Mtwara",
                "contactName": "Joseph Mbwana",
                "contactEmail": "joseph@mtwaracoastal.org",
                "seats": 10,
                "usedSeats": 4,
                "clinics": 3,
                "createdAt": days_ago(38),
                "primaryColor": "#0c6b58",
            },
        ],
        "users": [
            {
                "id": "u_platform",
                "tenantId": None,
                "name": "SkinLink Operator",
                "email": "ops@skinlink.io",
                "role": "platform_admin",
                "title": "Platform Administrator",
                "status": "active",
                "avatarColor": "#0c2340",
                "lastActive": hours_ago(1),
                "createdAt": days_ago(500),
            },
            {
                "id": "u_amina",
                "tenantId": "t_mwanza",
                "name": "Dr. Amina Hassan",
                "email": "amina@mwanzahealth.org",
                "role": "org_admin",
                "title": "Lead Dermatologist",
                "specialty": "General Dermatology",
                "phone": "+255 754 100 100",
                "status": "active",
                "avatarColor": "#1f7a8c",
                "lastActive": hours_ago(2),
                "createdAt": days_ago(210),
            },
            {
                "id": "u_daniel",
                "tenantId": "t_mwanza",
                "name": "Dr. Daniel Okoth",
                "email": "daniel@mwanzahealth.org",
                "role": "specialist",
                "title": "Dermatologist",
                "specialty": "Pediatric Dermatology",
                "status": "active",
                "avatarColor": "#2b4c7e",
                "lastActive": hours_ago(5),
                "createdAt": days_ago(180),
            },
            {
                "id": "u_neema",
                "tenantId": "t_mwanza",
                "name": "Neema Joseph",
                "email": "neema@mwanzahealth.org",
                "role": "clinician",
                "title": "Community Health Worker",
                "phone": "+255 754 100 102",
                "status": "active",
                "avatarColor": "#0c6b58",
                "lastActive": hours_ago(9),
                "createdAt": days_ago(150),
            },
            {
                "id": "u_joseph",
                "tenantId": "t_mtwara",
                "name": "Joseph Mbwana",
                "email": "joseph@mtwaracoastal.org",
                "role": "org_admin",
                "title": "Clinic Coordinator",
                "status": "active",
                "avatarColor": "#0c6b58",
                "lastActive": hours_ago(20),
                "createdAt": days_ago(38),
            },
        ],
        "patients": [
            {
                "id": "p_fatuma",
                "tenantId": "t_mwanza",
                "code": "PT-0001",
                "fullName": "Fatuma K.",
                "age": 45,
                "gender": "Female",
                "phone": "+255 712 000 001",
                "village": "Mbuyuni",
                "region": "Mwanza",
                "consentObtained": True,
                "registeredById": "u_neema",
                "createdAt": days_ago(4),
                "notes": "Recurrent itchy patches on forearm.",
            },
            {
                "id": "p_juma",
                "tenantId": "t_mwanza",
                "code": "PT-0002",
                "fullName": "Juma A.",
                "age": 33,
                "gender": "Male",
                "village": "Nyakato",
                "region": "Mwanza",
                "consentObtained": True,
                "registeredById": "u_neema",
                "createdAt": days_ago(6),
            },
        ],
        "cases": [
            {
                "id": "c_0891",
                "tenantId": "t_mwanza",
                "ref": "REF-2024-0891",
                "patientId": "p_fatuma",
                "clinicianId": "u_neema",
                "specialistId": "u_amina",
                "primaryConcern": "Itchy rash on forearm",
                "clinicalInfo": "Itchy rash on forearm, present for 2 days. No fever.",
                "durationDays": 2,
                "suspectedCondition": "Suspected Eczema",
                "status": "new",
                "priority": "routine",
                "bodySite": "Forearm",
                "images": [
                    {
                        "id": "img_1",
                        "url": "/uploads/sample/eczema-close-up.png",
                        "angle": "Close-up",
                        "quality": "good",
                        "qualityScore": 92,
                        "capturedAt": hours_ago(2),
                    },
                    {
                        "id": "img_2",
                        "url": "/uploads/sample/arm-wide.png",
                        "angle": "Overview",
                        "quality": "good",
                        "qualityScore": 88,
                        "capturedAt": hours_ago(2),
                    },
                ],
                "notes": [],
                "createdAt": hours_ago(2),
                "updatedAt": hours_ago(2),
            },
            {
                "id": "c_reviewed",
                "tenantId": "t_mwanza",
                "ref": "REF-2024-0850",
                "patientId": "p_juma",
                "clinicianId": "u_neema",
                "specialistId": "u_amina",
                "primaryConcern": "Chronic dermatitis flare",
                "clinicalInfo": "Patient reports worsening over 1 week.",
                "durationDays": 7,
                "suspectedCondition": "Atopic Dermatitis",
                "status": "reviewed",
                "priority": "routine",
                "bodySite": "Lower leg",
                "images": [
                    {
                        "id": "img_3",
                        "url": "/uploads/sample/dermatitis.png",
                        "angle": "Close-up",
                        "quality": "good",
                        "qualityScore": 90,
                        "capturedAt": days_ago(3),
                    }
                ],
                "treatmentPlan": {
                    "id": "tp_1",
                    "diagnosis": "Atopic Dermatitis",
                    "medications": [
                        {"name": "Topical corticosteroid", "instructions": "Apply twice daily for 2 weeks"},
                        {"name": "Emollient moisturizer", "instructions": "Use daily as needed"},
                    ],
                    "patientEducation": ["Avoid known triggers", "Keep skin moisturized"],
                    "avoidTriggers": ["Harsh soaps", "Wool clothing"],
                    "followUpDays": 14,
                    "notes": "Return sooner if worsening or new symptoms.",
                    "createdById": "u_amina",
                    "createdAt": days_ago(1),
                },
                "notes": [
                    {
                        "id": "n_1",
                        "authorId": "u_amina",
                        "authorName": "Dr. Amina Hassan",
                        "body": "Suitable for remote management. Topical therapy recommended.",
                        "createdAt": days_ago(1),
                    }
                ],
                "createdAt": days_ago(5),
                "updatedAt": days_ago(1),
            },
        ],
        "referrals": [
            {
                "id": "r_1",
                "tenantId": "t_mwanza",
                "ref": "REF-2024-0891",
                "caseId": "c_0891",
                "patientName": "Fatuma K.",
                "fromClinic": "Mwanza Regional Health Network",
                "status": "pending",
                "priority": "routine",
                "createdAt": hours_ago(2),
            },
            {
                "id": "r_2",
                "tenantId": "t_mwanza",
                "ref": "REF-2024-0850",
                "caseId": "c_reviewed",
                "patientName": "Juma A.",
                "fromClinic": "Mwanza Regional Health Network",
                "status": "responded",
                "priority": "routine",
                "createdAt": days_ago(5),
                "respondedAt": days_ago(1),
            },
        ],
        "followUps": [
            {
                "id": "f_1",
                "tenantId": "t_mwanza",
                "caseId": "c_reviewed",
                "caseRef": "REF-2024-0850",
                "patientName": "Juma A.",
                "scheduledFor": days_ahead(7),
                "status": "scheduled",
                "purpose": "7-day treatment response check",
            }
        ],
        "resources": [
            {
                "id": "res_1",
                "tenantId": "t_mwanza",
                "title": "Eczema care guide",
                "category": "Patient Education",
                "type": "PDF",
                "description": "Printable patient handout for atopic dermatitis care.",
                "updatedAt": days_ago(30),
            },
            {
                "id": "res_2",
                "tenantId": "t_mwanza",
                "title": "Image capture best practices",
                "category": "Clinical Protocol",
                "type": "Protocol",
                "description": "How to take clear lesion photos from multiple angles.",
                "updatedAt": days_ago(60),
            },
        ],
    }
