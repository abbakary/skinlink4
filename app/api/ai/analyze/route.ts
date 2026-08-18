import { type NextRequest, NextResponse } from "next/server"

// ---------------------------------------------------------------------------
// AI analysis endpoint for SkinLink.
//
// This returns a STRUCTURED contract identical to what a real model would
// produce (image-quality check + differential diagnosis + urgency triage).
// Today it is simulated deterministically from the case payload so the UI is
// fully functional offline. To go live, drop in the Vercel AI SDK here:
//
//   import { generateObject } from "ai"
//   const { object } = await generateObject({
//     model: "openai/gpt-4o",
//     schema: aiAnalysisSchema,
//     messages: [{ role: "user", content: [{ type: "text", text: prompt },
//       ...images.map((u) => ({ type: "image", image: u }))] }],
//   })
//
// The response shape below already matches `AiAnalysis` in lib/types.ts.
// ---------------------------------------------------------------------------

interface AnalyzeBody {
  primaryConcern?: string
  clinicalInfo?: string
  suspectedCondition?: string
  durationDays?: number
  images?: { url: string; angle?: string }[]
}

// A small deterministic knowledge base so the simulated output is clinically
// plausible and varies with the concern.
const KB: Record<string, { differentials: { condition: string; probability: number; rationale: string }[]; urgency: "routine" | "urgent" | "emergency"; action: string }> = {
  eczema: {
    differentials: [
      { condition: "Atopic Dermatitis", probability: 78, rationale: "Symmetric, itchy, ill-defined erythematous patches consistent with atopic pattern." },
      { condition: "Allergic Contact Dermatitis", probability: 54, rationale: "Localized distribution could indicate contact allergen exposure." },
      { condition: "Psoriasis (plaque)", probability: 21, rationale: "Lacks well-demarcated silvery scale typical of plaque psoriasis." },
    ],
    urgency: "routine",
    action: "Suitable for teledermatology management. Recommend topical corticosteroid trial and review.",
  },
  acne: {
    differentials: [
      { condition: "Acne Vulgaris (inflammatory)", probability: 84, rationale: "Comedones with inflammatory papules/pustules on face is characteristic." },
      { condition: "Folliculitis", probability: 32, rationale: "Follicular pustules possible, but distribution favors acne." },
      { condition: "Rosacea", probability: 15, rationale: "Less likely given comedonal component and age." },
    ],
    urgency: "routine",
    action: "Start topical retinoid + benzoyl peroxide. Review in 8 weeks.",
  },
  pigmented: {
    differentials: [
      { condition: "Atypical Melanocytic Nevus", probability: 48, rationale: "Irregular pigment network warrants dermoscopic scrutiny." },
      { condition: "Melanoma", probability: 39, rationale: "Asymmetry and border irregularity raise suspicion — cannot exclude remotely." },
      { condition: "Seborrheic Keratosis", probability: 18, rationale: "Possible but pigment pattern is atypical." },
    ],
    urgency: "urgent",
    action: "Flag for in-person review / biopsy. Do not manage remotely — possible malignancy.",
  },
  dermatitis: {
    differentials: [
      { condition: "Chronic Irritant Contact Dermatitis", probability: 66, rationale: "Lichenification with ill-defined borders suggests chronic irritation." },
      { condition: "Atopic Dermatitis", probability: 44, rationale: "Chronic itch-scratch cycle supports atopic component." },
      { condition: "Stasis Dermatitis", probability: 27, rationale: "Lower-leg location — consider venous insufficiency." },
    ],
    urgency: "urgent",
    action: "Potent topical steroid + emollients; assess for infection. Review in 2 weeks.",
  },
  default: {
    differentials: [
      { condition: "Nonspecific Dermatitis", probability: 58, rationale: "Features are nonspecific; correlate clinically." },
      { condition: "Fungal Infection (tinea)", probability: 41, rationale: "Consider if annular/scaly; a skin scraping may help." },
      { condition: "Contact Reaction", probability: 30, rationale: "Possible localized allergen/irritant exposure." },
    ],
    urgency: "routine",
    action: "Insufficient specificity — recommend additional well-lit images and clinical correlation.",
  },
}

function pickKB(text: string) {
  const t = text.toLowerCase()
  if (t.includes("acne")) return KB.acne
  if (t.includes("pigment") || t.includes("melanoma") || t.includes("mole")) return KB.pigmented
  if (t.includes("eczema") || t.includes("atopic") || t.includes("itch")) return KB.eczema
  if (t.includes("dermatitis")) return KB.dermatitis
  return KB.default
}

function confidenceOf(p: number): "High" | "Moderate" | "Low" {
  if (p >= 65) return "High"
  if (p >= 40) return "Moderate"
  return "Low"
}

// Deterministic pseudo image-quality score derived from the URL so results are
// stable across renders. A real model inspects blur, exposure, framing, focus.
function scoreImage(url: string) {
  let h = 0
  for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) % 1000
  return 68 + (h % 30) // 68-97
}

export async function POST(req: NextRequest) {
  let body: AnalyzeBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const text = `${body.suspectedCondition ?? ""} ${body.primaryConcern ?? ""} ${body.clinicalInfo ?? ""}`.trim()
  const images = body.images ?? []

  // --- Image quality check -------------------------------------------------
  const scored = images.map((img) => ({ ...img, qualityScore: scoreImage(img.url) }))
  const avg = scored.length ? Math.round(scored.reduce((s, i) => s + i.qualityScore, 0) / scored.length) : 0
  const flags: string[] = []
  scored.forEach((img, i) => {
    if (img.qualityScore < 72) flags.push(`Image ${i + 1} (${img.angle ?? "unlabelled"}) low quality — possible blur/underexposure`)
  })
  if (images.length === 0) flags.push("No images provided — cannot assess morphology")
  if (images.length === 1) flags.push("Only one image — additional angles recommended for confident assessment")

  // --- Differential diagnosis ---------------------------------------------
  const kb = pickKB(text)
  const differentials = kb.differentials.map((d) => ({
    condition: d.condition,
    probability: d.probability,
    confidence: confidenceOf(d.probability),
    rationale: d.rationale,
  }))

  const analysis = {
    imageQualityAverage: avg,
    imageQualityFlags: flags,
    differentials,
    recommendedAction: kb.action,
    urgencyFlag: kb.urgency,
    generatedAt: new Date().toISOString(),
    model: "skinlink-derm-vision-1 (simulated)",
  }

  // Simulate model latency.
  await new Promise((r) => setTimeout(r, 700))

  return NextResponse.json(analysis)
}
