import { Suspense } from "react"
import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/login-form"
import { SkinLinkLogo } from "@/components/brand/logo"
import { ShieldCheck, Activity, Users } from "lucide-react"

export const metadata: Metadata = {
  title: "Sign in — SkinLink",
  description: "Sign in to your SkinLink tele-dermatology workspace.",
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #1f7a8c 0, transparent 40%), radial-gradient(circle at 80% 60%, #2b4c7e 0, transparent 45%)",
          }}
        />
        <div className="relative">
          <SkinLinkLogo variant="light" />
        </div>
        <div className="relative max-w-md">
          <h1 className="font-heading text-3xl font-bold leading-tight text-balance text-white">
            Specialist dermatology care, connected to every clinic.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-sidebar-foreground/70 text-pretty">
            SkinLink links village clinics to dermatology specialists through secure digital referrals — triage,
            review, treatment guidance and follow-up, all in one tenant-isolated workspace.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            <Feature icon={ShieldCheck} label="Bank-grade, per-organization data isolation" />
            <Feature icon={Activity} label="AI-assisted triage and image quality checks" />
            <Feature icon={Users} label="Roles for specialists, clinicians and administrators" />
          </ul>
        </div>
        <p className="relative text-xs text-sidebar-foreground/50">
          © {new Date().getFullYear()} SkinLink. Accounts are provisioned by the platform team.
        </p>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <SkinLinkLogo />
          </div>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  )
}

function Feature({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/20 text-sidebar-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-sidebar-foreground/80">{label}</span>
    </li>
  )
}
