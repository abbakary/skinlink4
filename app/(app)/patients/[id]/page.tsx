"use client"

import { use, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Plus, MapPin, Phone, Calendar, ShieldCheck, ShieldAlert } from "lucide-react"
import { useData } from "@/lib/data-store"
import { PageHeader } from "@/components/shell/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CaseCard } from "@/components/case-card"
import { formatDate, initials } from "@/lib/format"

export default function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { getPatient, cases, getUser } = useData()

  const patient = getPatient(id)
  const patientCases = useMemo(
    () => cases.filter((c) => c.patientId === id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [cases, id],
  )

  if (!patient) {
    return (
      <div>
        <PageHeader title="Patient not found" breadcrumbs={[{ label: "Patients", href: "/patients" }, { label: "Not found" }]} />
        <Card className="p-12 text-center text-sm text-muted-foreground">This patient does not exist in your organization.</Card>
      </div>
    )
  }

  const registeredBy = getUser(patient.registeredById)

  return (
    <div>
      <PageHeader
        title={patient.fullName}
        description={`${patient.code} · ${patient.age} / ${patient.gender}`}
        breadcrumbs={[{ label: "Patients", href: "/patients" }, { label: patient.fullName }]}
        actions={
          <Button onClick={() => router.push(`/cases/new?patient=${patient.id}`)}>
            <Plus className="h-4 w-4" /> New referral
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile */}
        <Card className="p-5 lg:col-span-1">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">{initials(patient.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-heading text-lg font-semibold">{patient.fullName}</p>
              <p className="text-xs text-muted-foreground">{patient.code}</p>
            </div>
          </div>

          <dl className="mt-5 space-y-3 text-sm">
            <Row icon={Calendar} label="Age / gender" value={`${patient.age} · ${patient.gender}`} />
            <Row icon={MapPin} label="Location" value={`${patient.village}, ${patient.region}`} />
            <Row icon={Phone} label="Phone" value={patient.phone ?? "—"} />
            <Row
              icon={patient.consentObtained ? ShieldCheck : ShieldAlert}
              label="Consent"
              value={patient.consentObtained ? "Obtained" : "Not on file"}
            />
            <Row icon={Calendar} label="Registered" value={`${formatDate(patient.createdAt)} · ${registeredBy?.name ?? ""}`} />
          </dl>

          {patient.notes && (
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground">Medical history / notes</p>
              <p className="mt-1 text-sm leading-relaxed">{patient.notes}</p>
            </div>
          )}
        </Card>

        {/* Cases */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold">Case history ({patientCases.length})</h2>
          </div>
          {patientCases.length === 0 ? (
            <Card className="p-12 text-center text-sm text-muted-foreground">
              No cases yet for this patient.
              <div className="mt-3">
                <Button size="sm" onClick={() => router.push(`/cases/new?patient=${patient.id}`)}>
                  <Plus className="h-4 w-4" /> Start a referral
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {patientCases.map((c) => (
                <CaseCard key={c.id} dermCase={c} patient={patient} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate font-medium">{value}</p>
      </div>
    </div>
  )
}
