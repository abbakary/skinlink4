// ---------------------------------------------------------------------------
// SkinLink — domain model
// Multi-tenant tele-dermatology SaaS. Every record that belongs to a customer
// organization carries a `tenantId`. Platform-level records (tenants, platform
// admins) live outside any tenant. All API access is scoped by tenant so that
// data from one organization is fully isolated from another.
// ---------------------------------------------------------------------------

export type ID = string

export type UserRole =
  | "platform_admin" // SkinLink SaaS operator — manages all tenants
  | "org_admin" // tenant administrator
  | "specialist" // dermatologist reviewing cases
  | "clinician" // frontline village-clinic health worker

export type TenantStatus = "active" | "trial" | "suspended" | "pending"
export type TenantPlan = "pilot" | "growth" | "enterprise"

export interface Tenant {
  id: ID
  name: string
  slug: string
  plan: TenantPlan
  status: TenantStatus
  country: string
  region: string
  contactName: string
  contactEmail: string
  seats: number
  usedSeats: number
  clinics: number
  createdAt: string
  primaryColor: string
}

export interface User {
  id: ID
  tenantId: ID | null // null for platform_admin
  name: string
  email: string
  role: UserRole
  title?: string
  specialty?: string
  phone?: string
  status: "active" | "invited" | "disabled"
  avatarColor: string
  lastActive: string
  createdAt: string
}

export type Gender = "Male" | "Female" | "Other"

export interface Patient {
  id: ID
  tenantId: ID
  code: string // e.g. PT-0001
  fullName: string
  age: number
  gender: Gender
  phone?: string
  village: string
  region: string
  consentObtained: boolean
  registeredById: ID // clinician
  createdAt: string
  notes?: string
}

export type CaseStatus = "new" | "in_review" | "reviewed" | "follow_up" | "closed"
export type CasePriority = "routine" | "urgent" | "emergency"
export type ConfidenceLevel = "High" | "Moderate" | "Low"
export type ImageQuality = "good" | "acceptable" | "poor"

export interface LesionImage {
  id: ID
  url: string
  angle: string
  quality: ImageQuality
  qualityScore: number // 0-100 AI image-quality check
  qualityNotes?: string
  capturedAt: string
}

export interface DifferentialDx {
  condition: string
  confidence: ConfidenceLevel
  probability: number // 0-100
  rationale: string
}

export interface AiAnalysis {
  imageQualityAverage: number
  imageQualityFlags: string[]
  differentials: DifferentialDx[]
  recommendedAction: string
  urgencyFlag: CasePriority
  generatedAt: string
  model: string
}

export interface TreatmentPlan {
  id: ID
  diagnosis: string
  medications: { name: string; instructions: string }[]
  patientEducation: string[]
  avoidTriggers: string[]
  followUpDays: number
  notes?: string
  createdById: ID
  createdAt: string
}

export interface CaseNote {
  id: ID
  authorId: ID
  authorName: string
  body: string
  createdAt: string
}

export type FollowUpResponse = "resolved" | "improved" | "mild_improvement" | "unchanged" | "worsened"
export type FollowUpAdherence = "full" | "partial" | "stopped_adverse" | "stopped_stock"
export type FollowUpAction = "discharge" | "continue" | "adjust_regimen" | "escalate"

export interface FollowUpReport {
  id: ID
  caseId: ID
  response: FollowUpResponse
  adherence: FollowUpAdherence
  symptoms: string
  notes?: string
  progressPhotoUrl?: string
  worsening: boolean
  submittedAt: string
  submittedByName?: string
  specialistFeedback?: string
  specialistAction?: FollowUpAction
  respondedAt?: string
  respondedByName?: string
}

export interface DermCase {
  id: ID
  tenantId: ID
  ref: string // REF-2024-0891
  patientId: ID
  clinicianId: ID
  specialistId?: ID
  primaryConcern: string
  clinicalInfo: string
  durationDays: number
  suspectedCondition: string
  status: CaseStatus
  priority: CasePriority
  images: LesionImage[]
  ai?: AiAnalysis
  treatmentPlan?: TreatmentPlan
  followUpReport?: FollowUpReport
  notes: CaseNote[]
  createdAt: string
  updatedAt: string
}

export type ReferralStatus = "pending" | "accepted" | "responded" | "declined"

export interface Referral {
  id: ID
  tenantId: ID
  ref: string
  caseId: ID
  patientName: string
  fromClinic: string
  toSpecialistId?: ID
  status: ReferralStatus
  priority: CasePriority
  createdAt: string
  respondedAt?: string
}

export type FollowUpStatus = "scheduled" | "due" | "overdue" | "completed"

export interface FollowUp {
  id: ID
  tenantId: ID
  caseId: ID
  caseRef: string
  patientName: string
  scheduledFor: string
  status: FollowUpStatus
  assignedToId?: ID
  purpose: string
  outcome?: string
  followUpReport?: FollowUpReport
}

export interface Resource {
  id: ID
  tenantId: ID
  title: string
  category: string
  type: "PDF" | "Video" | "Article" | "Protocol"
  description: string
  updatedAt: string
}

export interface Database {
  tenants: Tenant[]
  users: User[]
  patients: Patient[]
  cases: DermCase[]
  referrals: Referral[]
  followUps: FollowUp[]
  resources: Resource[]
}
