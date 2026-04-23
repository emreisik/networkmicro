import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16">
      <section className="flex flex-col items-center gap-4 text-center">
        <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Manual social task verification
        </span>
        <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
          Coordinate creators. Verify proof. Pay on time.
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
          Network Mikro is the operations layer for brands that run manual
          social campaigns. Publish tasks, let reviewers verify submissions, and
          settle payouts in weekly batches — without spreadsheets.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Button asChild size="lg">
            <Link href="/register">
              Get started <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: ClipboardCheck,
            title: "Run campaigns",
            body: "Structured tasks with reward, requirements, and time windows that users claim and complete.",
          },
          {
            icon: ShieldCheck,
            title: "Review submissions",
            body: "A fast reviewer queue with screenshot previews, user trust history, and one-click decisions.",
          },
          {
            icon: Coins,
            title: "Settle payouts",
            body: "Group earnings into weekly batches, mark as paid, and keep a full audit trail of every cent.",
          },
        ].map((f) => (
          <Card key={f.title}>
            <CardContent className="flex flex-col gap-2 p-6">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3 p-6">
            <h3 className="text-base font-semibold">
              Operational discipline by default
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Role-based access (Super Admin, Admin, Reviewer, Brand, User)",
                "Trust score per user with logged history",
                "Transactional approvals — earning, score, audit in one commit",
                "Weekly payout batches with reconcilable items",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-3 p-6">
            <h3 className="text-base font-semibold">Built for reviewers</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Queue with filters by platform, campaign, user, and risk",
                "Large screenshot preview with post URL side-by-side",
                "Approve, reject, or request revision — fully auditable",
                "Trust score updates applied deterministically",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
