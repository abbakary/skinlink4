"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  ShieldCheck,
  Building2,
  Activity,
  Users,
  Send,
  CalendarClock,
  Sparkles,
  Stethoscope,
  Lock,
  Smartphone,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Check,
} from "lucide-react"
import { SkinLinkLogo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const PORTAL_LINKS = [
  {
    title: "Specialist Dashboard",
    description: "Triage incoming rural referrals, view high-res lesion photos & issue guidance",
    href: "/dashboard",
    icon: Stethoscope,
    badge: "Specialist View",
    color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  },
  {
    title: "Case Triage Queue",
    description: "Priority queue filtered by urgency red flags, SLAs, and clinical body sites",
    href: "/cases",
    icon: Send,
    badge: "Priority Queue",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  {
    title: "AI Decision Assistant",
    description: "Multi-class lesion analyzer with differential diagnoses and quality scores",
    href: "/ai-assistant",
    icon: Sparkles,
    badge: "AI-Powered",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  {
    title: "Follow-Up Engine",
    description: "Schedule, track and re-evaluate progress reviews across 7, 14 & 30 day intervals",
    href: "/follow-up",
    icon: CalendarClock,
    badge: "Care Continuity",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    title: "Patient Registry",
    description: "Unified clinical patient directory across village health posts & district clinics",
    href: "/patients",
    icon: Users,
    badge: "EHR Directory",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    title: "Platform & Tenant Admin",
    description: "Manage multi-tenant clinic networks, seat allocation, and organization accounts",
    href: "/administration",
    icon: Building2,
    badge: "Network Admin",
    color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  },
]

const WORKFLOW_STEPS = [
  {
    id: "capture",
    step: "01",
    role: "Village Health Worker / Nurse",
    title: "Patient Registration & Image Capture",
    description:
      "A frontline health worker registers a patient at a rural clinic, captures standardized lesion photos (Overview, Close-up, Macro) using the offline-capable Flutter mobile app, and logs structured symptoms.",
    highlights: [
      "Real-time photo quality validation score (>85% target)",
      "Structured symptom & red-flag checklist (fever, rapid spread)",
      "Automatic local offline draft saving with background sync",
    ],
    previewImage: "/landing/hero-teledermatology.png",
  },
  {
    id: "triage",
    step: "02",
    role: "SkinLink AI & Triage Engine",
    title: "Instant Triage & AI Decision Support",
    description:
      "Cases are automatically assigned urgency priority (Routine <24h vs Urgent <4h). The embedded AI engine checks image clarity and suggests top 3 differential diagnoses to assist the specialist.",
    highlights: [
      "Automated SLA assignment based on clinical red flags",
      "Multi-class skin condition differential analysis",
      "Multi-tenant data isolation ensures total patient privacy",
    ],
    previewImage: "/landing/hero-teledermatology.png",
  },
  {
    id: "guidance",
    step: "03",
    role: "Dermatology Specialist",
    title: "Remote Assessment & Treatment Plan",
    description:
      "A hospital dermatologist reviews high-resolution photos, reads AI suggestions, confirms final diagnosis, and prescribes a treatment regimen with patient education and trigger avoidance notes.",
    highlights: [
      "One-click structured prescription & medication dispensing plan",
      "Interactive image zoom & side-by-side comparison tools",
      "Auto-generates branded printable PDF patient handout",
    ],
    previewImage: "/landing/hero-teledermatology.png",
  },
  {
    id: "followup",
    step: "04",
    role: "Rural Clinic & Patient",
    title: "Patient Handout & Follow-up Tracking",
    description:
      "The rural clinic receives guidance in real time, prints the patient treatment handout, dispenses medication, and schedules a 7/14-day progress review to monitor healing.",
    highlights: [
      "Printable offline patient education PDF handout",
      "Visual baseline vs. progress comparison photos",
      "Automated follow-up reminders for due & overdue progress reviews",
    ],
    previewImage: "/landing/hero-teledermatology.png",
  },
]

const FEATURES = [
  {
    icon: Send,
    title: "Digital Clinical Referrals",
    description: "Village health posts submit structured clinical details and multi-angle lesion photos directly to regional specialist queues.",
    tag: "Core Workflow",
  },
  {
    icon: Sparkles,
    title: "AI Decision Support & Triage",
    description: "Quality scores and differential diagnosis suggestions accelerate specialist review while keeping human experts in total control.",
    tag: "AI Assist",
  },
  {
    icon: Stethoscope,
    title: "Structured Treatment Regimens",
    description: "Specialists generate comprehensive treatment guidance, medication dosages, trigger warnings, and patient care handouts.",
    tag: "Clinical Care",
  },
  {
    icon: CalendarClock,
    title: "Continuity & Follow-up Engine",
    description: "Track patient progress over time with scheduled reviews, progress photo comparisons, and automated overdue alerts.",
    tag: "Care Tracking",
  },
  {
    icon: ShieldCheck,
    title: "Strict Multi-Tenant Isolation",
    description: "Every clinic network operates in a securely partitioned workspace. Patient records, staff access, and stats never leak across orgs.",
    tag: "Enterprise Security",
  },
  {
    icon: Smartphone,
    title: "Resilient Offline Mobile App",
    description: "Frontline health workers can capture cases in low-bandwidth or offline rural settings, syncing automatically when connected.",
    tag: "Field Ready",
  },
]

const ROLE_SOLUTIONS = [
  {
    role: "Frontline Health Workers",
    subtitle: "For Nurses, Clinical Officers & CHWs",
    icon: Smartphone,
    color: "from-teal-600 to-emerald-700",
    features: [
      "Guided 4-step mobile case capture wizard",
      "Instant camera quality guidance (lighting & focus)",
      "Offline local draft storage & automatic background sync",
      "Printable PDF treatment handouts for patients",
    ],
    ctaText: "Explore Mobile App Workflow",
    ctaHref: "/referrals",
  },
  {
    role: "Dermatology Specialists",
    subtitle: "For Hospital Consultants & Dermatologists",
    icon: Stethoscope,
    color: "from-blue-600 to-indigo-700",
    features: [
      "Prioritized triage queue sorted by SLA urgency",
      "High-resolution pan & zoom image inspection viewer",
      "AI-assisted differential diagnosis & quality scoring",
      "Pre-built treatment templates & follow-up scheduler",
    ],
    ctaText: "Open Specialist Dashboard",
    ctaHref: "/dashboard",
  },
  {
    role: "Health Network Leaders",
    subtitle: "For Hospital Directors & Program Admins",
    icon: Building2,
    color: "from-slate-700 to-slate-900",
    features: [
      "Multi-clinic network performance & SLA metrics",
      "Role-based access control & seat provisioning",
      "Strict organizational data partition & audit trail",
      "Region-wide epidemiological trend insights",
    ],
    ctaText: "Manage Organization Accounts",
    ctaHref: "/administration",
  },
]

const FAQS = [
  {
    q: "How does SkinLink work in rural areas with poor internet connection?",
    a: "The SkinLink Flutter mobile app is engineered for offline resiliency. Clinicians can register patients, capture photos, and save complete referral drafts locally. Once internet connectivity is restored, the app automatically synchronizes all drafts to the central FastAPI backend.",
  },
  {
    q: "What is the role of AI in the SkinLink platform?",
    a: "SkinLink AI serves as a decision support tool for specialists, NOT an autonomous diagnostic agent. It performs automatic photo quality checks (lighting, focus, blur) and presents differential diagnostic suggestions. The reviewing specialist always retains final clinical authority.",
  },
  {
    q: "How is patient data kept secure across different hospital networks?",
    a: "SkinLink uses a multi-tenant architecture with strict data isolation. Each organization (tenant) has its own isolated dataset. Staff members only access data belonging to their specific health network.",
  },
  {
    q: "How does a health facility or clinic network sign up?",
    a: "To ensure proper credentialing and governance, account provisioning is managed by the SkinLink team. Contact us or click 'Request Access' to set up your organization's custom workspace.",
  },
]

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(0)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Sticky Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <SkinLinkLogo />

          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#portals" className="transition-colors hover:text-foreground">
              Portal Directory
            </a>
            <a href="#workflow" className="transition-colors hover:text-foreground">
              Clinical Flow
            </a>
            <a href="#features" className="transition-colors hover:text-foreground">
              Platform Capabilities
            </a>
            <a href="#roles" className="transition-colors hover:text-foreground">
              Role Solutions
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="shadow-sm">
              <Link href="/dashboard">
                Launch Workspace <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-primary/5 via-background to-background py-16 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left Column: Hero Copy */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Tele-Dermatology Referral Platform &amp; AI Triage
              </div>

              <h1 className="mt-6 font-heading text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.1]">
                Empowering rural clinics with <span className="text-primary">specialist dermatology</span> care.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                SkinLink connects village health centers with hospital dermatologists. Capture clinical lesion photos,
                receive AI-assisted triage suggestions, obtain structured treatment guidance, and track patient follow-ups.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="h-12 px-6 text-base shadow-md">
                  <Link href="/dashboard">
                    <Stethoscope className="mr-2 h-5 w-5" /> Specialist Dashboard
                  </Link>
                </Button>

                <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
                  <Link href="/cases">
                    <Send className="mr-2 h-5 w-5 text-primary" /> Case Triage Queue
                  </Link>
                </Button>

                <Button asChild size="lg" variant="ghost" className="h-12 px-4 text-sm font-semibold">
                  <Link href="/login">
                    Sign In to Portal <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {/* Security & Access Note */}
              <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Multi-Tenant Data Partitioning
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Lock className="h-4 w-4 text-primary" /> Role-Based Access Control
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Smartphone className="h-4 w-4 text-amber-600" /> Offline Mobile Sync
                </span>
              </div>
            </div>

            {/* Right Column: Interactive Live Simulation Card */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md rounded-2xl border border-border bg-card/90 p-5 shadow-2xl backdrop-blur sm:p-6 lg:max-w-none">
                {/* Header Badge */}
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-heading text-sm font-bold">Referral Live Preview</p>
                      <p className="text-xs text-muted-foreground">REF-2024-0891 · Mwanza Region</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    Urgent SLA (&lt;4h)
                  </Badge>
                </div>

                {/* Patient Summary */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Patient:</span>
                    <span className="font-semibold text-foreground">Fatuma K. (45 yrs, Female)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Primary Concern:</span>
                    <span className="font-medium text-foreground">Itchy rash on forearm (2 days)</span>
                  </div>

                  {/* AI Prediction Box */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
                        <Sparkles className="h-4 w-4" /> AI Differential Suggestion
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600">92% Quality Score</span>
                    </div>
                    <p className="mt-1 text-sm font-bold">Suspected Contact Dermatitis vs. Atopic Flare</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Recommendation: Topical corticosteroid twice daily + emollient moisturizer.
                    </p>
                  </div>

                  {/* Specialist Action Quick Bar */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button size="sm" className="w-full text-xs font-semibold" asChild>
                      <Link href="/cases/c_0891">
                        Review &amp; Approve <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" className="w-full text-xs font-semibold" asChild>
                      <Link href="/ai-assistant">
                        <Sparkles className="mr-1 h-3.5 w-3.5 text-purple-600" /> AI Assistant
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Floating Stat Pill */}
                <div className="absolute -bottom-4 -left-4 hidden rounded-xl border border-border bg-card p-3 shadow-lg sm:flex sm:items-center sm:gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">98.4% Response SLA</p>
                    <p className="text-[10px] text-muted-foreground">Average review time &lt; 2.5 hours</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Impact Strip */}
      <section className="border-b border-border bg-card/60 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 divide-x-0 divide-y divide-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <div className="px-3 text-center sm:text-left">
              <p className="font-heading text-3xl font-extrabold text-primary">&lt; 4 Hours</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">Urgent Referral Target SLA</p>
            </div>
            <div className="px-3 text-center sm:text-left">
              <p className="font-heading text-3xl font-extrabold text-emerald-600">84%</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">Avoided Unnecessary Hospital Travel</p>
            </div>
            <div className="px-3 text-center sm:text-left">
              <p className="font-heading text-3xl font-extrabold text-blue-600">98%</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">Clinical Image Quality Compliance</p>
            </div>
            <div className="px-3 text-center sm:text-left">
              <p className="font-heading text-3xl font-extrabold text-purple-600">100%</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">Tenant Data Partition &amp; Security</p>
            </div>
          </div>
        </div>
      </section>

      {/* Organized Portal Button Links Directory */}
      <section id="portals" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              App Portal Directory
            </Badge>
            <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
              Access every application module directly.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Select a module below to launch the specialist queue, patient registry, AI assistant, or admin tools.
            </p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PORTAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl border ${link.color}`}>
                    <link.icon className="h-5 w-5" />
                  </span>
                  <Badge variant="outline" className={`text-[11px] ${link.color}`}>
                    {link.badge}
                  </Badge>
                </div>
                <h3 className="mt-4 font-heading text-lg font-bold transition-colors group-hover:text-primary">
                  {link.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{link.description}</p>
              </div>

              <div className="mt-6 flex items-center gap-1 text-xs font-bold text-primary">
                Open Portal <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Step-by-Step Clinical Workflow Showcase */}
      <section id="workflow" className="border-y border-border/80 bg-muted/40 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              Clinical Workflow
            </Badge>
            <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
              How SkinLink delivers specialist care in 4 steps.
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
              From village health post to hospital specialist review, here is how a patient referral flows through the system.
            </p>
          </div>

          {/* Workflow Step Tabs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {WORKFLOW_STEPS.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(idx)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                  activeStep === idx
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card text-muted-foreground hover:bg-card/80 hover:text-foreground border border-border"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/20 text-[10px]">
                  {step.step}
                </span>
                {step.title}
              </button>
            ))}
          </div>

          {/* Active Step Showcase Box */}
          <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-xl lg:p-10">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className="flex items-center gap-3">
                  <span className="font-heading text-3xl font-extrabold text-primary">
                    Step {WORKFLOW_STEPS[activeStep].step}
                  </span>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {WORKFLOW_STEPS[activeStep].role}
                  </Badge>
                </div>

                <h3 className="mt-3 font-heading text-2xl font-bold sm:text-3xl">
                  {WORKFLOW_STEPS[activeStep].title}
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {WORKFLOW_STEPS[activeStep].description}
                </p>

                <ul className="mt-6 space-y-2.5">
                  {WORKFLOW_STEPS[activeStep].highlights.map((h, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-xs font-semibold sm:text-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button asChild size="sm">
                    <Link href="/cases">
                      Try Workflow Demo <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/login">Sign In to Test</Link>
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/60 p-2 shadow-inner">
                  <Image
                    src={WORKFLOW_STEPS[activeStep].previewImage}
                    alt={WORKFLOW_STEPS[activeStep].title}
                    width={600}
                    height={400}
                    className="h-64 w-full rounded-xl object-cover sm:h-80"
                  />
                  <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Based Solutions */}
      <section id="roles" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="text-center">
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            Role-Based Workspaces
          </Badge>
          <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
            Tailored tools for every member of the care team.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Whether you are capturing photos in the field, triaging in a hospital, or overseeing a health network.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {ROLE_SOLUTIONS.map((role) => (
            <div
              key={role.role}
              className="flex flex-col justify-between rounded-3xl border border-border bg-card p-7 shadow-sm transition-all hover:shadow-md"
            >
              <div>
                <div className={`inline-flex rounded-2xl bg-gradient-to-r ${role.color} p-3.5 text-white shadow-md`}>
                  <role.icon className="h-6 w-6" />
                </div>

                <h3 className="mt-5 font-heading text-xl font-bold">{role.role}</h3>
                <p className="text-xs font-medium text-muted-foreground">{role.subtitle}</p>

                <ul className="mt-6 space-y-3">
                  {role.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-border">
                <Button asChild className="w-full text-xs font-bold" variant="outline">
                  <Link href={role.ctaHref}>
                    {role.ctaText} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Platform Features Grid */}
      <section id="features" className="border-t border-border bg-card/40 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              Full Feature Suite
            </Badge>
            <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
              Engineered for clinical precision and reliability.
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {feature.tag}
                  </Badge>
                </div>
                <h3 className="mt-4 font-heading text-base font-bold">{feature.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faq" className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="text-center">
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            FAQ
          </Badge>
          <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="mt-10 space-y-4">
          {FAQS.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border bg-card overflow-hidden transition-colors"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="flex w-full items-center justify-between p-5 text-left font-heading text-base font-bold"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${
                    openFaq === idx ? "rotate-180 text-primary" : ""
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-xs leading-relaxed text-muted-foreground border-t border-border/50 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* High Impact Call-to-Action */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 p-8 text-white shadow-2xl sm:p-12 lg:p-16">
          <div className="relative z-10 max-w-2xl">
            <Badge variant="outline" className="border-white/30 bg-white/10 text-white">
              Get Started Today
            </Badge>
            <h2 className="mt-4 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Ready to bring specialist skin care to your clinic network?
            </h2>
            <p className="mt-4 text-sm text-slate-300 sm:text-base">
              Sign in to your organization workspace or launch the interactive specialist dashboard to test the referral pipeline.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="h-12 bg-white px-6 text-slate-900 hover:bg-slate-100 font-bold">
                <Link href="/dashboard">
                  Launch Specialist Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-white/30 bg-transparent px-6 text-white hover:bg-white/10"
              >
                <Link href="/login">Sign In with Credentials</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/60">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <SkinLinkLogo />
              <p className="mt-4 text-xs text-muted-foreground">
                SkinLink is a multi-tenant tele-dermatology referral platform connecting rural healthcare workers with hospital specialists.
              </p>
            </div>

            <div>
              <p className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">App Modules</p>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link href="/dashboard" className="hover:text-primary">
                    Specialist Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/cases" className="hover:text-primary">
                    Case Triage Queue
                  </Link>
                </li>
                <li>
                  <Link href="/ai-assistant" className="hover:text-primary">
                    AI Decision Assistant
                  </Link>
                </li>
                <li>
                  <Link href="/follow-up" className="hover:text-primary">
                    Follow-Up Tracker
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">Management</p>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link href="/patients" className="hover:text-primary">
                    Patient Directory
                  </Link>
                </li>
                <li>
                  <Link href="/referrals" className="hover:text-primary">
                    Referral Pipeline
                  </Link>
                </li>
                <li>
                  <Link href="/administration" className="hover:text-primary">
                    Organization Admin
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-primary">
                    User Sign In
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">Security &amp; SLA</p>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Isolated Multi-Tenant DB
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-600" /> SLA Target: &lt; 4 Hours
                </p>
                <p>© {new Date().getFullYear()} SkinLink. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
