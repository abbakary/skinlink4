"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Loader2, LogIn, TriangleAlert } from "lucide-react"
import { useData } from "@/lib/data-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const DEMO_ACCOUNTS = [
  { label: "Platform operator", email: "ops@skinlink.io", password: "platform123" },
  { label: "Org admin (Mwanza)", email: "amina@mwanzahealth.org", password: "clinic123" },
  { label: "Clinician (Mwanza)", email: "neema@mwanzahealth.org", password: "clinic123" },
]

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { login, isAuthenticated, isPlatformAdmin, authReady } = useData()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const next = params.get("next")

  // If already signed in, bounce to the right home.
  useEffect(() => {
    if (authReady && isAuthenticated) {
      router.replace(next || (isPlatformAdmin ? "/provider" : "/dashboard"))
    }
  }, [authReady, isAuthenticated, isPlatformAdmin, next, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = await login(email, password)
    if (!result.ok) {
      setError(result.error ?? "Unable to sign in.")
      setSubmitting(false)
      return
    }
    const dest = next || (result.user?.role === "platform_admin" ? "/provider" : "/dashboard")
    router.replace(dest)
  }

  function useDemo(acc: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(acc.email)
    setPassword(acc.password)
    setError(null)
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold tracking-tight">Sign in</h2>
      <p className="mt-1 text-sm text-muted-foreground">Welcome back. Enter your credentials to continue.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@clinic.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          Sign in
        </Button>
      </form>

      <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/40 p-4">
        <p className="text-xs font-medium text-muted-foreground">Demo accounts — click to fill</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => useDemo(acc)}
              className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-background"
            >
              <span className="font-medium">{acc.label}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{acc.email}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Need an account?{" "}
        <a href="/#contact" className="font-medium text-primary hover:underline">
          Contact the SkinLink team
        </a>
      </p>
    </div>
  )
}
