import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Icon = React.ComponentType<{ className?: string }>;

export default function LandingPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute -top-24 right-0 -z-10 h-[520px] w-[520px] rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-0 -z-10 h-[420px] w-[420px] rounded-full bg-accent blur-3xl" />

        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 lg:grid-cols-2 lg:py-28">
          <div className="flex flex-col gap-6">
            <span className="inline-flex items-center gap-2 self-start rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Manual social task verification
            </span>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              Run the campaign.
              <span className="block text-primary/70">Pay for real posts.</span>
            </h1>
            <p className="max-w-xl text-base text-muted-foreground md:text-lg">
              Brands post tasks. Users publish on their own social accounts.
              Reviewers verify the proof. Weekly payouts settle automatically.
              All of it, auditable, in one place.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/register">
                  Get started free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> No credit
                card
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> 5-minute
                setup
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Weekly
                payouts
              </span>
            </div>
          </div>

          <div className="relative">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-20">
          <SectionHeading
            label="How it works"
            title="Four steps, end to end"
            sub="Claim, post, prove, get paid. Nothing else."
          />
          <div className="mt-14 grid gap-4 md:grid-cols-4">
            <StepCard
              n={1}
              icon={ClipboardCheck}
              title="Claim a task"
              body="Pick an open campaign. Reward, rules and deadline — all upfront."
            />
            <StepCard
              n={2}
              icon={Camera}
              title="Publish"
              body="Post on your own social account following the brief. Stays on-brand."
            />
            <StepCard
              n={3}
              icon={Send}
              title="Submit proof"
              body="Upload a screenshot and the post URL. Double-sided verification."
            />
            <StepCard
              n={4}
              icon={Wallet}
              title="Get paid"
              body="Approved tasks roll into the weekly payout batch. No chasing."
            />
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-b bg-muted/20">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 md:grid-cols-4">
          <Stat value="98%" label="Payout accuracy rate" />
          <Stat value="< 24h" label="Average review time" />
          <Stat value="7 days" label="Weekly batch cycle" />
          <Stat value="5 roles" label="Role-based access model" />
        </div>
      </section>

      {/* FOR WHO */}
      <section className="border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-20">
          <SectionHeading
            label="Built for"
            title="Three sides, one platform"
            sub="Every role sees the same data from its own angle."
          />
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            <AudienceCard
              icon={TrendingUp}
              title="Brands"
              lines={[
                "Launch campaigns & briefs",
                "Manage asset library",
                "Track weekly spend",
              ]}
            />
            <AudienceCard
              icon={Users}
              title="Creators"
              lines={[
                "Browse open tasks",
                "Submit proof fast",
                "Grow your trust score",
              ]}
            />
            <AudienceCard
              icon={ShieldCheck}
              title="Reviewers"
              lines={[
                "Fast review queue",
                "Approve / reject / revise",
                "Risk & fraud flags",
              ]}
            />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-20">
          <SectionHeading
            label="Platform"
            title="Operational discipline, by default"
            sub="A manual workflow, as safe as automation."
          />
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={ShieldCheck}
              title="Role-based access"
              body="SUPER_ADMIN to USER hierarchy, enforced in both middleware and server actions."
            />
            <Feature
              icon={Star}
              title="Trust score"
              body="Every user rated 0–100. Approvals, rejections, no-shows and fraud — all logged."
            />
            <Feature
              icon={Wallet}
              title="Weekly payouts"
              body="Eligible earnings grouped automatically. One-click paid with a full audit trail."
            />
            <Feature
              icon={ClipboardCheck}
              title="Transactional"
              body="Reviews, earnings, trust — each runs inside a Prisma transaction. No partial state."
            />
            <Feature
              icon={Camera}
              title="S3-compatible storage"
              body="Screenshots and campaign assets on R2, MinIO, AWS — plug and play."
            />
            <Feature
              icon={Coins}
              title="Complete audit log"
              body="Money, score, review status — every change leaves a trail. Reconcile and prove."
            />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-5 px-4 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Start today. Paid tomorrow.
          </h2>
          <p className="max-w-xl text-sm opacity-80 md:text-base">
            No setup needed. Sign in with a seeded account in minutes, then
            build your first campaign.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href="/register">
                Create account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

// ------------------------------------------------------------
// Section helpers
// ------------------------------------------------------------

function SectionHeading({
  label,
  title,
  sub,
}: {
  label: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h2>
      {sub ? (
        <p className="max-w-xl text-sm text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  );
}

function StepCard({
  n,
  icon: Icon,
  title,
  body,
}: {
  n: number;
  icon: Icon;
  title: string;
  body: string;
}) {
  return (
    <div className="relative rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {n}
        </span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-semibold md:text-4xl">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function AudienceCard({
  icon: Icon,
  title,
  lines,
}: {
  icon: Icon;
  title: string;
  lines: string[];
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <ul className="space-y-1.5">
        {lines.map((l) => (
          <li
            key={l}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: Icon;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

// ------------------------------------------------------------
// Hero mockup — abstract dashboard preview
// ------------------------------------------------------------

function HeroMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-[32px] bg-gradient-to-tr from-primary/10 via-transparent to-accent blur-2xl" />
      <div className="rounded-2xl border bg-card p-4 shadow-2xl">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b pb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <span className="ml-3 text-[11px] text-muted-foreground">
            network-mikro / dashboard
          </span>
        </div>

        {/* KPI row */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { l: "Balance", v: "$164.00" },
            { l: "Trust", v: "88 / 100" },
            { l: "Open tasks", v: "12" },
          ].map((s) => (
            <div key={s.l} className="rounded-lg border bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {s.l}
              </div>
              <div className="mt-1 text-sm font-semibold">{s.v}</div>
            </div>
          ))}
        </div>

        {/* Queue */}
        <div className="mt-4 rounded-lg border">
          <div className="flex items-center justify-between border-b p-3">
            <span className="text-xs font-medium">Review queue</span>
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning">
              5 pending
            </span>
          </div>
          {[
            { t: "Acme Launch · Instagram", when: "2m" },
            { t: "Holiday Drop · TikTok", when: "18m" },
            { t: "FinBridge · LinkedIn", when: "1h" },
          ].map((r) => (
            <div
              key={r.t}
              className="flex items-center gap-3 border-b p-3 last:border-b-0"
            >
              <div className="h-9 w-9 shrink-0 rounded-md bg-gradient-to-br from-primary/30 to-accent" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{r.t}</div>
                <div className="text-[10px] text-muted-foreground">
                  submitted · {r.when} ago
                </div>
              </div>
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
                review
              </span>
            </div>
          ))}
        </div>

        {/* Payout */}
        <div className="mt-4 flex items-center justify-between rounded-lg border bg-muted/30 p-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Weekly payout
            </div>
            <div className="text-sm font-semibold">$1,247.50 settled</div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[10px] font-medium text-success">
            <CheckCircle2 className="h-3 w-3" /> Paid
          </span>
        </div>
      </div>
    </div>
  );
}
