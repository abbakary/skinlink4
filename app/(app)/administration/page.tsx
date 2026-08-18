"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ShieldCheck,
  Users,
  Building2,
  Armchair,
  MapPin,
  Mail,
  UserPlus,
  Settings,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react"
import { toast } from "sonner"
import { useData } from "@/lib/data-store"
import { PageHeader } from "@/components/shell/page-header"
import { StatCard } from "@/components/stat-card"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate, initials, timeAgo } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { User, UserRole } from "@/lib/types"

const ROLE_LABEL: Record<UserRole, string> = {
  platform_admin: "Platform Admin",
  org_admin: "Org Admin",
  specialist: "Specialist",
  clinician: "Clinician",
}

const PLAN_LABEL: Record<string, string> = {
  pilot: "Pilot",
  growth: "Growth",
  enterprise: "Enterprise",
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  invited: "secondary",
  disabled: "destructive",
}

export default function AdministrationPage() {
  const {
    users,
    activeTenant,
    currentUser,
    isPlatformAdmin,
    cases,
    patients,
    addUser,
    updateUser,
  } = useData()
  const [showInvite, setShowInvite] = useState(false)

  const canManage = currentUser.role === "org_admin" || currentUser.role === "platform_admin"

  const seatPct = activeTenant ? Math.round((activeTenant.usedSeats / activeTenant.seats) * 100) : 0

  const roleCounts = useMemo(() => {
    const counts: Partial<Record<UserRole, number>> = {}
    for (const u of users) counts[u.role] = (counts[u.role] ?? 0) + 1
    return counts
  }, [users])

  if (!activeTenant && !isPlatformAdmin) {
    return (
      <div>
        <PageHeader title="Administration" description="Organization settings and team management" />
        <Card className="p-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">No organization selected</p>
          <p className="mt-1 text-sm text-muted-foreground">Select an organization from the top bar to manage its settings.</p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Administration"
        description="Manage your organization, team members, and workspace settings"
        actions={
          <>
            {isPlatformAdmin && (
              <Button asChild variant="outline">
                <Link href="/provider">
                  <ExternalLink className="h-4 w-4" /> Platform console
                </Link>
              </Button>
            )}
            {canManage && (
              <Button onClick={() => setShowInvite((v) => !v)}>
                <UserPlus className="h-4 w-4" /> {showInvite ? "Cancel" : "Invite member"}
              </Button>
            )}
          </>
        }
      />

      {activeTenant && (
        <>
          {/* Org header card */}
          <Card className="overflow-hidden">
            <div
              className="h-2"
              style={{ backgroundColor: activeTenant.primaryColor }}
            />
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
                  style={{ backgroundColor: activeTenant.primaryColor }}
                >
                  {activeTenant.region.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <h2 className="font-heading text-lg font-semibold">{activeTenant.name}</h2>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {activeTenant.region}, {activeTenant.country}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{PLAN_LABEL[activeTenant.plan] ?? activeTenant.plan}</Badge>
                    <Badge variant={activeTenant.status === "active" ? "default" : "secondary"}>
                      {activeTenant.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{activeTenant.clinics} clinic sites</span>
                  </div>
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="text-muted-foreground">Primary contact</p>
                <p className="font-medium">{activeTenant.contactName}</p>
                <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" /> {activeTenant.contactEmail}
                </p>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Team members" value={users.length} icon={Users} tone="primary" />
            <StatCard label="Seat utilization" value={`${seatPct}%`} icon={Armchair} tone={seatPct > 85 ? "warning" : "default"} />
            <StatCard label="Active cases" value={cases.filter((c) => c.status !== "closed").length} icon={ShieldCheck} />
            <StatCard label="Patients" value={patients.length} icon={Building2} tone="success" />
          </div>
        </>
      )}

      {showInvite && canManage && activeTenant && (
        <InviteMemberForm
          tenantId={activeTenant.id}
          primaryColor={activeTenant.primaryColor}
          onCancel={() => setShowInvite(false)}
          onSave={(data) => {
            addUser(data)
            toast.success(`Invited ${data.name}`)
            setShowInvite(false)
          }}
        />
      )}

      <Tabs defaultValue="team" className="mt-6">
        <TabsList>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="seats">Seats & usage</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-4">
          <Card>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="font-heading text-base font-semibold">Team members</h3>
                <p className="text-xs text-muted-foreground">
                  {roleCounts.specialist ?? 0} specialists · {roleCounts.clinician ?? 0} clinicians · {roleCounts.org_admin ?? 0} admins
                </p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Last active</TableHead>
                  {canManage && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback style={{ backgroundColor: user.avatarColor }} className="text-xs font-semibold text-white">
                            {initials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{ROLE_LABEL[user.role]}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">{user.title ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[user.status] ?? "outline"}>{user.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">{user.lastActive ? timeAgo(user.lastActive) : "—"}</span>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        {user.id !== currentUser.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {user.status !== "active" && (
                                <DropdownMenuItem onClick={() => { updateUser(user.id, { status: "active" }); toast.success("Member activated") }}>
                                  Activate
                                </DropdownMenuItem>
                              )}
                              {user.status === "active" && (
                                <DropdownMenuItem onClick={() => { updateUser(user.id, { status: "disabled" }); toast.success("Member disabled") }}>
                                  Disable
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => toast.info("Role change (demo)")}>
                                Change role
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="seats" className="mt-4">
          {activeTenant && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="p-5">
                <h3 className="font-heading text-base font-semibold">Seat allocation</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeTenant.usedSeats} of {activeTenant.seats} seats in use across your organization
                </p>
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{seatPct}% utilized</span>
                    <span className="text-muted-foreground">{activeTenant.seats - activeTenant.usedSeats} available</span>
                  </div>
                  <Progress value={seatPct} className="h-2.5" />
                </div>
                {seatPct > 85 && (
                  <p className="mt-4 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                    You're approaching your seat limit. Contact SkinLink to upgrade your plan.
                  </p>
                )}
              </Card>

              <Card className="p-5">
                <h3 className="font-heading text-base font-semibold">Usage by role</h3>
                <ul className="mt-4 space-y-3">
                  {(["org_admin", "specialist", "clinician"] as UserRole[]).map((role) => (
                    <li key={role} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{ROLE_LABEL[role]}</span>
                      <span className="font-semibold">{roleCounts[role] ?? 0}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 border-t border-border pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Clinic sites</span>
                    <span className="font-semibold">{activeTenant.clinics}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="font-medium">Plan</span>
                    <Badge variant="outline">{PLAN_LABEL[activeTenant.plan]}</Badge>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          {activeTenant && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="p-5">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  <h3 className="font-heading text-base font-semibold">Organization profile</h3>
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <SettingRow label="Organization name" value={activeTenant.name} />
                  <SettingRow label="Region" value={`${activeTenant.region}, ${activeTenant.country}`} />
                  <SettingRow label="Slug" value={activeTenant.slug} mono />
                  <SettingRow label="Contact" value={activeTenant.contactName} />
                  <SettingRow label="Email" value={activeTenant.contactEmail} />
                  <SettingRow label="Created" value={formatDate(activeTenant.createdAt)} />
                </dl>
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h3 className="font-heading text-base font-semibold">Security & compliance</h3>
                </div>
                <ul className="mt-4 space-y-3 text-sm">
                  <SecurityItem label="Tenant data isolation" status="Enabled" />
                  <SecurityItem label="Patient consent tracking" status="Enabled" />
                  <SecurityItem label="Audit logging" status="Enabled" />
                  <SecurityItem label="Two-factor authentication" status="Coming soon" muted />
                </ul>
                {!canManage && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Contact your organization administrator to change settings.
                  </p>
                )}
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SettingRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-medium text-right", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  )
}

function SecurityItem({ label, status, muted }: { label: string; status: string; muted?: boolean }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant={muted ? "outline" : "secondary"} className="text-[11px]">
        {status}
      </Badge>
    </li>
  )
}

function InviteMemberForm({
  tenantId,
  primaryColor,
  onCancel,
  onSave,
}: {
  tenantId: string
  primaryColor: string
  onCancel: () => void
  onSave: (data: Omit<User, "id" | "createdAt" | "lastActive">) => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<UserRole>("clinician")
  const [title, setTitle] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required")
      return
    }
    onSave({
      tenantId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      title: title.trim() || undefined,
      status: "invited",
      avatarColor: primaryColor,
    })
  }

  return (
    <Card className="mt-6 p-5">
      <h3 className="font-heading text-base font-semibold">Invite team member</h3>
      <p className="mt-1 text-sm text-muted-foreground">They'll receive an email invitation to join your organization.</p>
      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="inv-name">Full name</Label>
          <Input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" placeholder="Dr. Jane Doe" />
        </div>
        <div>
          <Label htmlFor="inv-email">Email</Label>
          <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" placeholder="jane@clinic.org" />
        </div>
        <div>
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger className="mt-1.5 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clinician">Clinician</SelectItem>
              <SelectItem value="specialist">Specialist</SelectItem>
              <SelectItem value="org_admin">Org Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="inv-title">Title (optional)</Label>
          <Input id="inv-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" placeholder="Community Health Worker" />
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit">Send invitation</Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}
