"use client"

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Send,
  ImagePlus,
  ArrowUpRight,
  CalendarClock,
  MessageSquare,
  ClipboardList,
  MapPin,
  Phone,
  User as UserIcon,
} from "lucide-react"
import { useData } from "@/lib/data-store"
import { PageHeader } from "@/components/shell/page-header"
import { ImageViewer } from "@/components/case/image-viewer"
import { AiPanel } from "@/components/case/ai-panel"
import { TreatmentPlanForm } from "@/components/case/treatment-plan-form"
import { CaseStatusBadge, PriorityBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDateTime, timeAgo, initials } from "@/lib/format"
import { FollowUpReviewCard } from "@/components/case/follow-up-review-card"
import type { AiAnalysis, FollowUpReport } from "@/lib/types"

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { cases, getCase, getPatient, getUser, currentUser, updateCase, addCaseNote, addFollowUp, followUps, updateFollowUp } = useData()

  const dermCase = getCase(id)
  const [aiLoading, setAiLoading] = useState(false)
  const [message, setMessage] = useState("")

  // Ordered queue for Previous / Next navigation.
  const ordered = useMemo(
    () => [...cases].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [cases],
  )
  const idx = ordered.findIndex((c) => c.id === id)
  const prev = idx > 0 ? ordered[idx - 1] : null
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null

  if (!dermCase) {
    return (
      <div>
        <PageHeader title="Case not found" breadcrumbs={[{ label: "Case queue", href: "/cases" }, { label: "Not found" }]} />
        <Card className="p-12 text-center text-sm text-muted-foreground">
          This case does not exist or belongs to another organization.
        </Card>
      </div>
    )
  }

  const patient = getPatient(dermCase.patientId)
  const clinician = getUser(dermCase.clinicianId)

  const runAi = async () => {
    setAiLoading(true)
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryConcern: dermCase.primaryConcern,
          clinicalInfo: dermCase.clinicalInfo,
          suspectedCondition: dermCase.suspectedCondition,
          durationDays: dermCase.durationDays,
          images: dermCase.images.map((i) => ({ url: i.url, angle: i.angle })),
        }),
      })
      const ai = (await res.json()) as AiAnalysis
      updateCase(dermCase.id, { ai })
      toast.success("AI analysis complete", { description: "Review the suggestion below — you make the final call." })
    } catch {
      toast.error("Analysis failed. Please try again.")
    } finally {
      setAiLoading(false)
    }
  }

  const claim = () => {
    updateCase(dermCase.id, { status: "in_review", specialistId: currentUser.id })
    toast.success("Case assigned to you")
  }

  const requestImages = () => {
    addCaseNote(dermCase.id, "Requested additional well-lit images from the clinic before assessment can be completed.")
    updateCase(dermCase.id, { status: "in_review" })
    toast.info("Clarification sent to clinic")
  }

  const escalate = () => {
    updateCase(dermCase.id, { priority: "emergency" })
    addCaseNote(dermCase.id, "Escalated for urgent in-person specialist referral — clinical red flags present.")
    toast.warning("Case escalated for in-person referral")
  }

  const handleFollowUpResponse = (updatedReport: FollowUpReport) => {
    const newStatus = updatedReport.specialistAction === "discharge" ? "closed" : "reviewed"
    updateCase(dermCase.id, {
      followUpReport: updatedReport,
      status: newStatus,
    })
    const fu = followUps.find((f) => f.caseId === dermCase.id)
    if (fu) {
      updateFollowUp(fu.id, {
        status: "completed",
        outcome: `Specialist feedback: ${updatedReport.specialistFeedback} (Action: ${updatedReport.specialistAction})`,
        followUpReport: updatedReport,
      })
    }
    addCaseNote(
      dermCase.id,
      `[Specialist Follow-Up Response] Action: ${updatedReport.specialistAction?.toUpperCase()} — ${updatedReport.specialistFeedback}`
    )
  }

  const savePlan: React.ComponentProps<typeof TreatmentPlanForm>["onSave"] = (plan) => {
    updateCase(dermCase.id, {
      status: "reviewed",
      treatmentPlan: { ...plan, id: `tp_${Date.now()}`, createdById: currentUser.id, createdAt: new Date().toISOString() },
      suspectedCondition: plan.diagnosis || dermCase.suspectedCondition,
    })
    if (plan.followUpDays > 0 && patient) {
      addFollowUp({
        caseId: dermCase.id,
        caseRef: dermCase.ref,
        patientName: patient.fullName,
        scheduledFor: new Date(Date.now() + plan.followUpDays * 86_400_000).toISOString(),
        status: "scheduled",
        assignedToId: currentUser.id,
        purpose: `Review ${plan.diagnosis} progress & adjust treatment`,
      })
    }
    toast.success("Treatment guidance sent to clinic", { description: "The clinic will receive the plan and follow-up interval." })
  }

  const sendMessage = () => {
    if (!message.trim()) return
    addCaseNote(dermCase.id, message.trim())
    setMessage("")
    toast.success("Message added to case")
  }

  return (
    <div>
      <PageHeader
        title={`${patient?.fullName ?? "Case"} · ${dermCase.suspectedCondition}`}
        description={`${dermCase.ref} · Received ${timeAgo(dermCase.createdAt)}`}
        breadcrumbs={[{ label: "Case queue", href: "/cases" }, { label: dermCase.ref }]}
        actions={
          <>
            <Button variant="outline" size="icon" disabled={!prev} onClick={() => prev && router.push(`/cases/${prev.id}`)} aria-label="Previous case">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={!next} onClick={() => next && router.push(`/cases/${next.id}`)} aria-label="Next case">
              <ChevronRight className="h-4 w-4" />
            </Button>
            {dermCase.status === "new" ? (
              <Button onClick={claim}>
                <ClipboardList className="h-4 w-4" /> Claim & review
              </Button>
            ) : dermCase.status !== "reviewed" && dermCase.status !== "closed" ? (
              <Button onClick={() => updateCase(dermCase.id, { status: "reviewed" })}>
                <CheckCircle2 className="h-4 w-4" /> Mark as reviewed
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-success/12 px-3 py-2 text-sm font-medium text-success">
                <CheckCircle2 className="h-4 w-4" /> Reviewed
              </span>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Patient + status */}
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarFallback style={{ backgroundColor: patient ? "#1f7a8c" : undefined }} className="text-sm font-semibold text-white">
                    {patient ? initials(patient.fullName) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-heading text-base font-semibold">{patient?.fullName ?? "Unknown patient"}</p>
                  <p className="text-xs text-muted-foreground">
                    {patient ? `${patient.code} · ${patient.age} / ${patient.gender}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <PriorityBadge priority={dermCase.priority} />
                <CaseStatusBadge status={dermCase.status} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              {patient && (
                <>
                  <Meta icon={MapPin} label="Location" value={`${patient.village}, ${patient.region}`} />
                  <Meta icon={Phone} label="Contact" value={patient.phone ?? "—"} />
                  <Meta icon={UserIcon} label="Registered by" value={clinician?.name ?? "—"} />
                </>
              )}
            </div>
          </Card>

          {/* Follow-Up Review if report submitted by rural clinic */}
          {dermCase.followUpReport && (
            <FollowUpReviewCard dermCase={dermCase} onRespond={handleFollowUpResponse} />
          )}

          {/* Clinical images */}
          <Card className="p-5">
            <h2 className="mb-3 font-heading text-base font-semibold">Clinical images</h2>
            <ImageViewer images={dermCase.images} />
          </Card>

          {/* Clinical information */}
          <Card className="p-5">
            <h2 className="mb-3 font-heading text-base font-semibold">Clinical information</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="Primary concern" value={dermCase.primaryConcern} />
              <Field label="Duration" value={`${dermCase.durationDays} day${dermCase.durationDays === 1 ? "" : "s"}`} />
              <Field label="Suspected condition" value={dermCase.suspectedCondition} />
              <Field label="Consent" value={patient?.consentObtained ? "Obtained" : "Not recorded"} />
            </dl>
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground">History &amp; notes</p>
              <p className="mt-1 text-sm leading-relaxed">{dermCase.clinicalInfo}</p>
            </div>
          </Card>

          {/* Audit trail / clarification */}
          <Card className="p-5">
            <h2 className="mb-1 font-heading text-base font-semibold">Case history &amp; clarification</h2>
            <p className="mb-4 text-xs text-muted-foreground">Secure messaging and audit trail attached to this case.</p>

            <ol className="relative space-y-4 border-l border-border pl-5">
              <TimelineItem title="Referral submitted" detail={`by ${clinician?.name ?? "clinic"} · ${dermCase.ref}`} time={dermCase.createdAt} />
              {dermCase.ai && <TimelineItem title="AI-assist analysis generated" detail={dermCase.ai.model} time={dermCase.ai.generatedAt} />}
              {dermCase.notes.map((n) => (
                <TimelineItem key={n.id} title={n.authorName} detail={n.body} time={n.createdAt} />
              ))}
              {dermCase.treatmentPlan && (
                <TimelineItem title="Treatment guidance sent" detail={dermCase.treatmentPlan.diagnosis} time={dermCase.treatmentPlan.createdAt} />
              )}
            </ol>

            <div className="mt-4 flex items-start gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a note or ask the clinic for clarification…"
                rows={2}
                className="flex-1"
              />
              <Button size="icon" className="h-10 w-10 shrink-0" onClick={sendMessage} disabled={!message.trim()} aria-label="Send message">
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <AiPanel analysis={dermCase.ai} loading={aiLoading} onRun={runAi} />

          {/* Clinical actions */}
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Clinical actions</h3>
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" className="justify-start" onClick={requestImages}>
                <ImagePlus className="h-4 w-4" /> Request more images
              </Button>
              <Button variant="outline" className="justify-start" onClick={escalate}>
                <ArrowUpRight className="h-4 w-4" /> Escalate to in-person
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => updateCase(dermCase.id, { status: "reviewed" })}>
                <Send className="h-4 w-4" /> Send response to clinic
              </Button>
            </div>
          </Card>

          {/* Treatment plan */}
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <h3 className="font-heading text-base font-semibold">Treatment plan</h3>
            </div>
            {dermCase.treatmentPlan && (
              <div className="mb-4 rounded-lg bg-success/8 p-3 text-xs text-muted-foreground">
                Sent {formatDateTime(dermCase.treatmentPlan.createdAt)} — you can update and resend below.
              </div>
            )}
            <TreatmentPlanForm
              initial={dermCase.treatmentPlan}
              suggestedDiagnosis={dermCase.ai?.differentials?.[0]?.condition}
              onSave={savePlan}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}

function Meta({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate font-medium">{value}</p>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  )
}

function TimelineItem({ title, detail, time }: { title: string; detail: string; time: string }) {
  return (
    <li className="relative">
      <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(time)}</span>
      </div>
      <p className="text-xs leading-snug text-muted-foreground">{detail}</p>
    </li>
  )
}
