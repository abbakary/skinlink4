"use client"

import Link from "next/link"
import Image from "next/image"
import type { DermCase, Patient } from "@/lib/types"
import { CaseStatusBadge, PriorityBadge } from "@/components/status-badge"
import { timeAgo } from "@/lib/format"
import { cn, formatImageUrl } from "@/lib/utils"

export function CaseCard({
  dermCase,
  patient,
  active,
}: {
  dermCase: DermCase
  patient?: Patient
  active?: boolean
}) {
  return (
    <Link
      href={`/cases/${dermCase.id}`}
      className={cn(
        "flex items-start gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40",
        active ? "border-primary ring-1 ring-primary/30" : "border-border",
      )}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        {dermCase.images[0] && (
          <Image src={formatImageUrl(dermCase.images[0].url)} alt="" fill className="object-cover" sizes="56px" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-mono text-[11px] text-muted-foreground">{dermCase.ref}</p>
          <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(dermCase.createdAt)}</span>
        </div>
        <p className="mt-0.5 truncate text-sm font-semibold">{patient?.fullName ?? "Unknown"}</p>
        <p className="truncate text-xs text-muted-foreground">
          {patient ? `${patient.age} / ${patient.gender[0]}` : ""} · {dermCase.suspectedCondition}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <CaseStatusBadge status={dermCase.status} />
          {dermCase.priority !== "routine" && <PriorityBadge priority={dermCase.priority} />}
        </div>
      </div>
    </Link>
  )
}
