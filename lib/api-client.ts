/**
 * SkinLink REST API client for the Next.js web app.
 * Set NEXT_PUBLIC_API_URL=http://localhost:8000 to point at the FastAPI backend.
 */

import type {
  DermCase,
  FollowUp,
  Patient,
  Referral,
  Resource,
  Tenant,
  User,
} from "./types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export const TOKEN_KEY = "skinlink.token"
export const SESSION_KEY = "skinlink.session.v1"

let activeTenantId: string | null = null

export function isApiEnabled() {
  return API_BASE.length > 0
}

export function getApiBase() {
  return API_BASE
}

export function setApiTenantId(id: string | null) {
  activeTenantId = id
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

function apiUrl(path: string) {
  return `${API_BASE}/api/v1${path}`
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (activeTenantId) headers["X-Tenant-Id"] = activeTenantId

  const res = await fetch(apiUrl(path), { ...init, headers })
  if (!res.ok) {
    let msg = `API error ${res.status}`
    try {
      const body = await res.json()
      if (body.detail) {
        msg = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail)
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(msg)
  }
  if (res.status === 204) return {} as T
  const text = await res.text()
  if (!text) return {} as T
  return JSON.parse(text) as T
}

export async function apiHealth(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl("/health"))
    return res.ok
  } catch {
    return false
  }
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    let msg = "Login failed"
    try {
      const body = await res.json()
      if (body.detail) msg = body.detail
    } catch {
      // ignore
    }
    throw new Error(msg)
  }
  return res.json() as Promise<{
    access_token: string
    user: User
    tenant: Tenant | null
  }>
}

export async function apiMe() {
  return apiFetch<{ user: User; tenant: Tenant | null }>("/auth/me")
}

export async function apiGetTenants() {
  return apiFetch<Tenant[]>("/tenants")
}

export async function apiGetUsers() {
  return apiFetch<User[]>("/users")
}

export async function apiGetPatients() {
  return apiFetch<Patient[]>("/patients")
}

export async function apiGetCases() {
  return apiFetch<DermCase[]>("/cases")
}

export async function apiGetCase(id: string) {
  return apiFetch<DermCase>(`/cases/${id}`)
}

export async function apiGetReferrals() {
  return apiFetch<Referral[]>("/referrals")
}

export async function apiGetFollowUps() {
  return apiFetch<FollowUp[]>("/follow-ups")
}

export async function apiGetResources() {
  return apiFetch<Resource[]>("/resources")
}

export async function apiCreatePatient(body: Record<string, unknown>) {
  return apiFetch<Patient>("/patients", { method: "POST", body: JSON.stringify(body) })
}

export async function apiUpdatePatient(id: string, patch: Record<string, unknown>) {
  return apiFetch<Patient>(`/patients/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
}

export async function apiCreateCase(body: Record<string, unknown>) {
  return apiFetch<DermCase>("/cases", { method: "POST", body: JSON.stringify(body) })
}

export async function apiUpdateCase(id: string, patch: Record<string, unknown>) {
  return apiFetch<DermCase>(`/cases/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
}

export async function apiAddCaseNote(caseId: string, body: string) {
  return apiFetch<DermCase>(`/cases/${caseId}/notes`, {
    method: "POST",
    body: JSON.stringify({ body }),
  })
}

export async function apiCreateFollowUp(body: Record<string, unknown>) {
  return apiFetch<FollowUp>("/follow-ups", { method: "POST", body: JSON.stringify(body) })
}

export async function apiUpdateFollowUp(id: string, patch: Record<string, unknown>) {
  return apiFetch<FollowUp>(`/follow-ups/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
}

export async function apiCreateReferral(body: Record<string, unknown>) {
  return apiFetch<Referral>("/referrals", { method: "POST", body: JSON.stringify(body) })
}

export async function apiUpdateReferral(id: string, patch: Record<string, unknown>) {
  return apiFetch<Referral>(`/referrals/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
}

export async function apiCreateResource(body: Record<string, unknown>) {
  return apiFetch<Resource>("/resources", { method: "POST", body: JSON.stringify(body) })
}

export async function apiCreateUser(body: Record<string, unknown>) {
  return apiFetch<User>("/users", { method: "POST", body: JSON.stringify(body) })
}

export async function apiUpdateUser(id: string, patch: Record<string, unknown>) {
  return apiFetch<User>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
}

export async function apiUpdateTenant(id: string, patch: Record<string, unknown>) {
  return apiFetch<Tenant>(`/tenants/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
}

export async function apiCreateTenantAccount(body: Record<string, unknown>) {
  return apiFetch<{ tenant: Tenant; admin: User }>("/tenants", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function apiUploadImage(file: File): Promise<string> {
  const token = getToken()
  const form = new FormData()
  form.append("file", file)
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (activeTenantId) headers["X-Tenant-Id"] = activeTenantId

  const res = await fetch(`${API_BASE}/api/v1/cases/upload-image`, {
    method: "POST",
    headers,
    body: form,
  })
  if (!res.ok) throw new Error("Image upload failed")
  const data = (await res.json()) as { url: string }
  return `${API_BASE}${data.url}`
}
