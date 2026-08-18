"use client"

import { useMemo, useState } from "react"
import {
  BarChart3,
  ClipboardList,
  Clock,
  TrendingUp,
  Users,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Download,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { useData } from "@/lib/data-store"
import { PageHeader } from "@/components/shell/page-header"
import { StatCard } from "@/components/stat-card"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartCard, ChartTooltip, CHART_COLORS } from "@/components/charts/chart-primitives"
import { cn } from "@/lib/utils"
import type { CaseStatus, CasePriority } from "@/lib/types"

type Period = "30d" | "90d" | "all"

const STATUS_LABEL: Record<CaseStatus, string> = {
  new: "New",
  in_review: "In review",
  reviewed: "Reviewed",
  follow_up: "Follow-up",
  closed: "Closed",
}

const PRIORITY_LABEL: Record<CasePriority, string> = {
  routine: "Routine",
  urgent: "Urgent",
  emergency: "Emergency",
}

const PERIODS: { key: Period; label: string; days: number | null }[] = [
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: null },
]

function inPeriod(iso: string, days: number | null) {
  if (days == null) return true
  return Date.now() - new Date(iso).getTime() <= days * 86_400_000
}

function weekLabel(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

export default function ReportsPage() {
  const { cases, patients, referrals, followUps, activeTenant } = useData()
  const [period, setPeriod] = useState<Period>("90d")
  const periodDays = PERIODS.find((p) => p.key === period)!.days

  const scopedCases = useMemo(
    () => cases.filter((c) => inPeriod(c.createdAt, periodDays)),
    [cases, periodDays],
  )

  const metrics = useMemo(() => {
    const reviewed = scopedCases.filter((c) => c.status === "reviewed" || c.status === "closed")
    const turnaroundDays =
      reviewed.length > 0
        ? reviewed.reduce((s, c) => s + (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) / 86_400_000, 0) /
          reviewed.length
        : 0
    const completionRate = scopedCases.length ? Math.round((reviewed.length / scopedCases.length) * 100) : 0
    const urgentCount = scopedCases.filter((c) => c.priority === "urgent" || c.priority === "emergency").length
    const overdueFollowUps = followUps.filter((f) => f.status === "overdue").length
    return { turnaroundDays, completionRate, urgentCount, overdueFollowUps, reviewed: reviewed.length }
  }, [scopedCases, followUps])

  const volumeTrend = useMemo(() => {
    const weeks = 8
    const buckets: { label: string; cases: number; reviewed: number }[] = []
    const now = Date.now()
    for (let i = weeks - 1; i >= 0; i--) {
      const start = now - (i + 1) * 7 * 86_400_000
      const end = now - i * 7 * 86_400_000
      const inWeek = scopedCases.filter((c) => {
        const t = new Date(c.createdAt).getTime()
        return t >= start && t < end
      })
      buckets.push({
        label: weekLabel(new Date(end - 86_400_000)),
        cases: inWeek.length,
        reviewed: inWeek.filter((c) => c.status === "reviewed" || c.status === "closed").length,
      })
    }
    return buckets
  }, [scopedCases])

  const statusData = useMemo(() => {
    const counts: Partial<Record<CaseStatus, number>> = {}
    for (const c of scopedCases) counts[c.status] = (counts[c.status] ?? 0) + 1
    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_LABEL[status as CaseStatus],
      value,
    }))
  }, [scopedCases])

  const priorityData = useMemo(() => {
    const counts: Partial<Record<CasePriority, number>> = {}
    for (const c of scopedCases) counts[c.priority] = (counts[c.priority] ?? 0) + 1
    return (["routine", "urgent", "emergency"] as CasePriority[]).map((p) => ({
      name: PRIORITY_LABEL[p],
      count: counts[p] ?? 0,
    }))
  }, [scopedCases])

  const conditionData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of scopedCases) {
      const key = c.suspectedCondition.split("—")[0].split("/")[0].trim()
      counts[key] = (counts[key] ?? 0) + 1
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name: name.length > 28 ? name.slice(0, 26) + "…" : name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [scopedCases])

  const referralFunnel = useMemo(() => {
    const scoped = referrals.filter((r) => inPeriod(r.createdAt, periodDays))
    return [
      { stage: "Submitted", count: scoped.length },
      { stage: "Accepted", count: scoped.filter((r) => r.status !== "pending" && r.status !== "declined").length },
      { stage: "Responded", count: scoped.filter((r) => r.status === "responded").length },
    ]
  }, [referrals, periodDays])

  const demographics = useMemo(() => {
    const ageGroups = [
      { name: "0–17", count: 0 },
      { name: "18–35", count: 0 },
      { name: "36–55", count: 0 },
      { name: "56+", count: 0 },
    ]
    for (const p of patients) {
      if (p.age < 18) ageGroups[0].count++
      else if (p.age <= 35) ageGroups[1].count++
      else if (p.age <= 55) ageGroups[2].count++
      else ageGroups[3].count++
    }
    const genderCounts: Record<string, number> = {}
    for (const p of patients) genderCounts[p.gender] = (genderCounts[p.gender] ?? 0) + 1
    const genderData = Object.entries(genderCounts).map(([name, value]) => ({ name, value }))
    return { ageGroups, genderData }
  }, [patients])

  const insights = useMemo(() => {
    const items: { tone: "info" | "warning" | "success"; title: string; body: string }[] = []

    const backlog = scopedCases.filter((c) => c.status === "new" || c.status === "in_review").length
    if (backlog > 3) {
      items.push({
        tone: "warning",
        title: "Review backlog building",
        body: `${backlog} cases are waiting for specialist review. Consider prioritizing urgent cases or redistributing workload across specialists.`,
      })
    }

    if (metrics.turnaroundDays > 3) {
      items.push({
        tone: "warning",
        title: "Turnaround above target",
        body: `Average time-to-review is ${metrics.turnaroundDays.toFixed(1)} days. Target is under 48 hours for routine cases.`,
      })
    } else if (scopedCases.length > 0) {
      items.push({
        tone: "success",
        title: "Strong review velocity",
        body: `Cases are being reviewed in ${metrics.turnaroundDays.toFixed(1)} days on average — within the recommended SLA window.`,
      })
    }

    const topCondition = conditionData[0]
    if (topCondition && topCondition.count >= 2) {
      items.push({
        tone: "info",
        title: `Top presenting condition: ${topCondition.name}`,
        body: `${topCondition.count} cases in this period. Ensure treatment protocols and patient education materials are up to date.`,
      })
    }

    const pendingReferrals = referrals.filter((r) => r.status === "pending").length
    if (pendingReferrals > 0) {
      items.push({
        tone: "info",
        title: `${pendingReferrals} referral${pendingReferrals > 1 ? "s" : ""} awaiting response`,
        body: "Follow up with receiving specialists to keep the referral pipeline moving.",
      })
    }

    if (metrics.overdueFollowUps > 0) {
      items.push({
        tone: "warning",
        title: `${metrics.overdueFollowUps} overdue follow-up${metrics.overdueFollowUps > 1 ? "s" : ""}`,
        body: "Patients may be at risk of treatment gaps. Schedule outreach from the Follow-up module.",
      })
    }

    if (metrics.completionRate >= 70 && scopedCases.length >= 3) {
      items.push({
        tone: "success",
        title: `${metrics.completionRate}% case completion rate`,
        body: "Most submitted cases are reaching a reviewed or closed state — a healthy indicator of program effectiveness.",
      })
    }

    return items.slice(0, 5)
  }, [scopedCases, metrics, conditionData, referrals])

  return (
    <div>
      <PageHeader
        title="Reports & analytics"
        description={
          activeTenant
            ? `Clinical intelligence for ${activeTenant.name}`
            : "Cross-organization performance insights"
        }
        actions={
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" /> Export summary
          </Button>
        }
      />

      {/* Period selector */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              period === p.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Cases in period" value={scopedCases.length} icon={ClipboardList} tone="primary" />
        <StatCard
          label="Avg. turnaround"
          value={scopedCases.length ? `${metrics.turnaroundDays.toFixed(1)}d` : "—"}
          icon={Clock}
          tone={metrics.turnaroundDays > 3 ? "warning" : "success"}
        />
        <StatCard label="Completion rate" value={`${metrics.completionRate}%`} icon={CheckCircle2} tone="success" />
        <StatCard label="Urgent / emergency" value={metrics.urgentCount} icon={AlertTriangle} tone="warning" />
      </div>

      {/* Volume trend + status mix */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard
          title="Case volume trend"
          description="Weekly submissions vs. reviews completed"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={volumeTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="casesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="reviewedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="cases" name="Submitted" stroke="var(--chart-1)" fill="url(#casesGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="reviewed" name="Reviewed" stroke="var(--chart-3)" fill="url(#reviewedGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Case status mix" description="Current distribution across workflow stages">
          {statusData.length === 0 ? (
            <p className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">No case data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={3} strokeWidth={0}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Conditions + priority + referral funnel */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Top conditions" description="Most frequent suspected diagnoses" className="lg:col-span-2">
          {conditionData.length === 0 ? (
            <p className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">No condition data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={conditionData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" />
                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={120} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ChartTooltip />} />
                <Bar dataKey="count" name="Cases" fill="var(--chart-2)" radius={[0, 6, 6, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Priority breakdown" description="Urgency distribution of cases">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={priorityData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ChartTooltip />} />
              <Bar dataKey="count" name="Cases" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {priorityData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Demographics + referral funnel + insights */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Patient age groups" description={`${patients.length} registered patients`}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={demographics.ageGroups} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ChartTooltip />} />
              <Bar dataKey="count" name="Patients" fill="var(--chart-4)" radius={[6, 6, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Referral funnel" description="Pipeline from submission to response">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={referralFunnel} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
              <XAxis dataKey="stage" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ChartTooltip />} />
              <Bar dataKey="count" name="Referrals" fill="var(--chart-5)" radius={[6, 6, 0, 0]} maxBarSize={52} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Gender distribution" description="Registered patient demographics">
          {demographics.genderData.length === 0 ? (
            <p className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">No patient data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={demographics.genderData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={4} strokeWidth={0}>
                  {demographics.genderData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* AI-style insights panel */}
      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border bg-primary/5 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Lightbulb className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-heading text-base font-semibold">Actionable insights</h2>
            <p className="text-xs text-muted-foreground">Data-driven recommendations for your clinical program</p>
          </div>
        </div>
        {insights.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            Not enough data to generate insights yet. Submit more cases to unlock analytics.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {insights.map((insight, i) => (
              <li key={i} className="flex gap-4 px-5 py-4">
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    insight.tone === "success" && "bg-success/12 text-success",
                    insight.tone === "warning" && "bg-warning/15 text-warning-foreground",
                    insight.tone === "info" && "bg-primary/10 text-primary",
                  )}
                >
                  {insight.tone === "success" ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : insight.tone === "warning" ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Activity className="h-4 w-4" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{insight.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Summary footer stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat icon={Users} label="Patients" value={patients.length} />
        <MiniStat icon={BarChart3} label="Reviewed cases" value={metrics.reviewed} />
        <MiniStat icon={Activity} label="Active referrals" value={referrals.filter((r) => r.status === "pending" || r.status === "accepted").length} />
        <MiniStat icon={Clock} label="Due follow-ups" value={followUps.filter((f) => f.status === "due" || f.status === "overdue").length} />
      </div>
    </div>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-heading text-lg font-bold">{value}</p>
      </div>
    </div>
  )
}
