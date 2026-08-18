"use client"

import { Bell, Building2, Check, ChevronDown, LogOut, Search, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { useData } from "@/lib/data-store"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

const roleLabel: Record<string, string> = {
  platform_admin: "Platform Admin",
  org_admin: "Org Admin",
  specialist: "Specialist",
  clinician: "Clinician",
}

export function Topbar() {
  const { currentUser, activeTenant, tenants, setActiveTenant, isPlatformAdmin, cases, logout } = useData()

  const newCount = cases.filter((c) => c.status === "new").length

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 lg:px-6">
      {/* Tenant / organization context */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className={cn(buttonVariants({ variant: "outline", size: "default" }), "h-9 gap-2 bg-transparent")}>
            <Building2 className="h-4 w-4 text-primary" />
            <span className="max-w-[180px] truncate text-sm font-medium">
              {activeTenant ? activeTenant.name : "All organizations"}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Organization workspace</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isPlatformAdmin && (
            <DropdownMenuItem onClick={() => setActiveTenant(null)}>
              <span className="flex-1">All organizations</span>
              {activeTenant === null && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          )}
          {tenants
            .filter((t) => isPlatformAdmin || t.id === currentUser.tenantId)
            .map((t) => (
              <DropdownMenuItem key={t.id} onClick={() => setActiveTenant(t.id)}>
                <div className="flex-1">
                  <p className="text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.region} · {t.plan}
                  </p>
                </div>
                {activeTenant?.id === t.id && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Search */}
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search cases, patients, referrals…" className="h-9 pl-9" />
      </div>

      <div className="flex-1 md:hidden" />

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {newCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {newCount}
          </span>
        )}
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Avatar className="h-8 w-8">
              <AvatarFallback style={{ backgroundColor: currentUser.avatarColor }} className="text-xs font-semibold text-white">
                {initials(currentUser.name)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground leading-tight">{roleLabel[currentUser.role]}</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <p className="text-sm">{currentUser.name}</p>
            <p className="text-xs font-normal text-muted-foreground">{currentUser.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => logout()}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
