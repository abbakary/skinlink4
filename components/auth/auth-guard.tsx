"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useData } from "@/lib/data-store"
import { SkinLinkMark } from "@/components/brand/logo"

// Client-side route guard for authenticated areas.
// - Waits for the persisted session to hydrate before deciding.
// - Redirects unauthenticated visitors to /login (preserving where they were).
// - Optionally restricts a subtree to platform operators.
export function AuthGuard({
  children,
  requirePlatformAdmin = false,
}: {
  children: React.ReactNode
  requirePlatformAdmin?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { authReady, isAuthenticated, isPlatformAdmin } = useData()

  useEffect(() => {
    if (!authReady) return
    if (!isAuthenticated) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : ""
      router.replace(`/login${next}`)
      return
    }
    if (requirePlatformAdmin && !isPlatformAdmin) {
      router.replace("/dashboard")
    }
  }, [authReady, isAuthenticated, isPlatformAdmin, requirePlatformAdmin, pathname, router])

  const blocked = !authReady || !isAuthenticated || (requirePlatformAdmin && !isPlatformAdmin)

  if (blocked) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <SkinLinkMark className="h-10 w-10 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading your workspace…</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
