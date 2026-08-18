"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, ArrowRight } from "lucide-react"
import { useData } from "@/lib/data-store"
import { PageHeader } from "@/components/shell/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Gender } from "@/lib/types"

export default function NewPatientPage() {
  const router = useRouter()
  const { addPatient, currentUser, activeTenant } = useData()

  const [fullName, setFullName] = useState("")
  const [age, setAge] = useState("")
  const [gender, setGender] = useState<Gender>("Female")
  const [village, setVillage] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [consent, setConsent] = useState(false)

  const valid = fullName.trim() && age && village.trim() && consent

  const save = (thenReferral: boolean) => {
    const p = addPatient({
      fullName: fullName.trim(),
      age: Number(age),
      gender,
      phone: phone.trim() || undefined,
      village: village.trim(),
      region: activeTenant?.region ?? "Mwanza",
      consentObtained: consent,
      registeredById: currentUser.id,
      notes: notes.trim() || undefined,
    })
    toast.success("Patient registered", { description: `${p.fullName} · ${p.code}` })
    router.push(thenReferral ? `/cases/new?patient=${p.id}` : `/patients/${p.id}`)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Register patient"
        description="Enter patient details. Consent is required before capturing images."
        breadcrumbs={[{ label: "Patients", href: "/patients" }, { label: "Register" }]}
      />

      <Card className="p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Fatuma K." className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="age">Age</Label>
            <Input id="age" type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} placeholder="45" className="mt-1.5" />
          </div>
          <div>
            <Label>Gender</Label>
            <Select value={gender} onValueChange={(v) => v && setGender(v as Gender)}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="village">Village / location</Label>
            <Input id="village" value={village} onChange={(e) => setVillage(e.target.value)} placeholder="Mbuyuni" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+255 7XX XXX XXX" className="mt-1.5" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Medical history / allergies (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Relevant history, chronic conditions, allergies, preferred language…" rows={3} className="mt-1.5" />
          </div>
          <label className="sm:col-span-2 flex items-start gap-2.5 rounded-lg border border-border p-3">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" />
            <span className="text-sm">
              <span className="font-medium">Consent obtained</span>
              <span className="block text-xs text-muted-foreground">
                Patient consents to clinical photography, secure remote specialist review and storage per data-governance policy.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => save(false)} disabled={!valid}>
            <Check className="h-4 w-4" /> Save patient
          </Button>
          <Button onClick={() => save(true)} disabled={!valid}>
            Save &amp; start referral <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  )
}
