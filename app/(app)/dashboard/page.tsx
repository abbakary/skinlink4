"use client"

import Link from "next/link"
import Image from "next/image"
import { ClipboardList, Clock, CheckCircle2, Users, Sparkles, CalendarClock, Send, Plus, ArrowRight } from "lucide-react"
import { useData } from "@/lib/data-store"
import { PageHeader } from "@/components/shell/page-header"
import { StatCard } from "@/components/stat-card"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CaseStatusBadge, PriorityBadge, FollowUpStatusBadge } from "@/components/status-badge"
import { timeAgo } from "@/lib/format"
import { formatImageUrl } from "@/lib/utils"

export default function DashboardPage() {
  const { cases, patients, followUps, referrals, currentUser, activeTenant, getPatient } = useData()

  const newCount = cases.filter((c) => c.status === "new").length
  const awaiting = cases.filter((c) => c.status === "in_review").length
  const completed = cases.filter((c) => c.status === "reviewed" || c.status === "closed").length
  const dueFollowUps = followUps.filter((f) => f.status === "due" || f.status === "overdue")

  const recent = [...cases].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 5)

  const firstName = currentUser.name.replace(/^Dr\.\s*/, "").split(" ")[0]

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={
          activeTenant
            ? `${activeTenant.name} · ${activeTenant.region}, ${activeTenant.country}`
            : "Platform overview across all organizations"
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/referrals">
                <Send className="h-4 w-4" /> Referrals
              </Link>
            </Button>
            <Button asChild>
              <Link href="/cases/new">
                <Plus className="h-4 w-4" /> New case
              </Link>
            </Button>
          </>
        }
      />

      {/* Today's overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New referrals" value={newCount} icon={ClipboardList} tone="primary" trend={12} trendLabel="vs last week" />
        <StatCard label="Awaiting review" value={awaiting} icon={Clock} tone="warning" />
        <StatCard label="Completed" value={completed} icon={CheckCircle2} tone="success" trend={8} trendLabel="vs last week" />
        <StatCard label="Registered patients" value={patients.length} icon={Users} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent cases */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="font-heading text-base font-semibold">Recent cases</h2>
              <p className="text-xs text-muted-foreground">Latest activity in the case queue</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/cases">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {recent.map((c) => {
              const patient = getPatient(c.patientId)
              return (
                <li key={c.id}>
                  <Link
                    href={`/cases/${c.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {c.images[0] && (
                        <Image src={formatImageUrl(c.images[0].url)} alt="" fill className="object-cover" sizes="48px" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{patient?.fullName ?? "Unknown"}</p>
                        <span className="text-xs text-muted-foreground">
                          {patient?.age}/{patient?.gender?.[0]}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.ref} · {c.suspectedCondition}
                      </p>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      <PriorityBadge priority={c.priority} />
                      <CaseStatusBadge status={c.status} />
                    </div>
                    <span className="hidden shrink-0 text-xs text-muted-foreground md:block">{timeAgo(c.updatedAt)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>

        {/* Side column */}
        <div className="space-y-6">
          {/* Quick actions */}
          <Card className="p-5">
            <h2 className="font-heading text-base font-semibold">Quick actions</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <QuickAction href="/patients/new" icon={Users} label="Register patient" />
              <QuickAction href="/cases/new" icon={Plus} label="New case" />
              <QuickAction href="/ai-assistant" icon={Sparkles} label="AI assistant" />
              <QuickAction href="/follow-up" icon={CalendarClock} label="Follow-ups" />
            </div>
          </Card>

          {/* Due follow-ups */}
          <Card>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-heading text-base font-semibold">Follow-ups due</h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/follow-up">All</Link>
              </Button>
            </div>
            {dueFollowUps.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">No follow-ups due right now.</p>
            ) : (
              <ul className="divide-y divide-border">
                {dueFollowUps.map((f) => (
                  <li key={f.id}>
                    <Link href={`/cases/${f.caseId}`} className="block px-5 py-3 transition-colors hover:bg-muted/50">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{f.patientName}</p>
                        <FollowUpStatusBadge status={f.status} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{f.purpose}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Referral summary */}
          <Card className="p-5">
            <h2 className="font-heading text-base font-semibold">Referral pipeline</h2>
            <div className="mt-3 space-y-2 text-sm">
              <Row label="Pending" value={referrals.filter((r) => r.status === "pending").length} />
              <Row label="Accepted" value={referrals.filter((r) => r.status === "accepted").length} />
              <Row label="Responded" value={referrals.filter((r) => r.status === "responded").length} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-start gap-2 rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-xs font-medium leading-tight">{label}</span>
    </Link>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
