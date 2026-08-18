"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Plus, Search, SlidersHorizontal } from "lucide-react"
import { useData } from "@/lib/data-store"
import { PageHeader } from "@/components/shell/page-header"
import { CaseCard } from "@/components/case-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CaseStatus } from "@/lib/types"

const TABS: { key: CaseStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "in_review", label: "In review" },
  { key: "reviewed", label: "Reviewed" },
  { key: "follow_up", label: "Follow-up" },
]

export default function CaseQueuePage() {
  const { cases, getPatient } = useData()
  const [tab, setTab] = useState<CaseStatus | "all">("all")
  const [query, setQuery] = useState("")
  const [priority, setPriority] = useState<string>("all")

  const filtered = useMemo(() => {
    return cases
      .filter((c) => (tab === "all" ? true : c.status === tab))
      .filter((c) => (priority === "all" ? true : c.priority === priority))
      .filter((c) => {
        if (!query) return true
        const p = getPatient(c.patientId)
        const hay = `${c.ref} ${c.suspectedCondition} ${c.primaryConcern} ${p?.fullName ?? ""}`.toLowerCase()
        return hay.includes(query.toLowerCase())
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  }, [cases, tab, priority, query, getPatient])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: cases.length }
    for (const t of TABS) if (t.key !== "all") c[t.key] = cases.filter((x) => x.status === t.key).length
    return c
  }, [cases])

  const urgentPending = useMemo(() => {
    return cases.filter(
      (c) => (c.priority === "urgent" || c.priority === "emergency") && c.status !== "reviewed" && c.status !== "closed"
    )
  }, [cases])

  return (
    <div>
      <PageHeader
        title="Specialist Triage Queue"
        description="Priority triage, clinical image review, and treatment guidance"
        actions={
          <Button asChild>
            <Link href="/cases/new">
              <Plus className="h-4 w-4" /> New referral
            </Link>
          </Button>
        }
      />

      {/* Urgent Alert Banner */}
      {urgentPending.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-200/80 text-amber-800 dark:bg-amber-800 dark:text-amber-100">
              <SlidersHorizontal className="h-5 w-5" />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold">
                {urgentPending.length} Urgent / Red-Flag Referral{urgentPending.length > 1 ? "s" : ""} Awaiting Review
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                Target specialist response SLA is &lt; 4 hours. Prioritize these cases before routine queue.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400 bg-white hover:bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100"
            onClick={() => setPriority("urgent")}
          >
            Filter urgent cases
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            <span className="rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by patient, reference or condition…"
            className="pl-9"
          />
        </div>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-full sm:w-44">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="routine">Routine</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="emergency">Emergency</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">No cases match your filters.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <CaseCard key={c.id} dermCase={c} patient={getPatient(c.patientId)} />
          ))}
        </div>
      )}
    </div>
  )
}
