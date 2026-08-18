"use client"

import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Building2, PlusCircle, LogOut, ArrowUpRight, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { useData } from "@/lib/data-store"
import { SkinLinkLogo, SkinLinkMark } from "@/components/brand/logo"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { initials } from "@/lib/format"

const NAV = [
  { label: "Overview", href: "/provider", icon: LayoutDashboard, exact: true },
  { label: "Organizations", href: "/provider/organizations", icon: Building2 },
  { label: "New account", href: "/provider/organizations/new", icon: PlusCircle },
]

export function ProviderShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, logout } = useData()

  function handleLogout() {
    logout()
    router.replace("/login")
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <Link href="/provider">
            <SkinLinkLogo variant="light" />
          </Link>
        </div>

        <div className="px-5 py-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sidebar-primary/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-primary">
            <Globe className="h-3 w-3" /> Provider console
          </span>
        </div>

        <nav className="flex-1 px-3 py-2">
          <ul className="space-y-0.5">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg bg-sidebar-accent/50 px-3 py-2.5 text-xs text-sidebar-foreground/80 transition-colors hover:text-sidebar-foreground"
          >
            <ArrowUpRight className="h-4 w-4 text-sidebar-primary" />
            Open a tenant workspace
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <SkinLinkMark className="h-7 w-7" />
            <span className="font-heading text-sm font-bold">Provider console</span>
          </div>
          <div className="hidden text-sm text-muted-foreground lg:block">Platform administration</div>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 outline-none transition-colors hover:bg-muted">
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  style={{ backgroundColor: currentUser.avatarColor }}
                  className="text-xs font-semibold text-white"
                >
                  {initials(currentUser.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-tight">{currentUser.name}</p>
                <p className="text-xs leading-tight text-muted-foreground">Platform Admin</p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <p className="text-sm">{currentUser.name}</p>
                <p className="text-xs font-normal text-muted-foreground">{currentUser.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                <ArrowUpRight className="mr-2 h-4 w-4" /> Tenant workspace
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Mobile nav */}
        <nav className="flex items-center gap-1 border-b border-border bg-card px-2 py-1.5 lg:hidden">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
