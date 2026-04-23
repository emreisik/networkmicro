import Link from "next/link";
import {
  Megaphone,
  ListChecks,
  Inbox,
  ShieldAlert,
  Users,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdminArea } from "@/lib/auth/require";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import {
  SubmissionStatusBadge,
  PlatformBadge,
} from "@/components/common/status-badge";
import { formatMoney, formatRelative } from "@/lib/format";

export default async function AdminOverviewPage() {
  await requireAdminArea();

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const [
    activeCampaigns,
    activeTasks,
    todaySubs,
    pendingReviews,
    approvedAgg,
    rejectedAgg,
    totalPaidAgg,
    riskyUsersCount,
    topPerformers,
    latestPending,
  ] = await Promise.all([
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.task.count({ where: { status: "OPEN" } }),
    prisma.submission.count({ where: { submittedAt: { gte: startOfDay } } }),
    prisma.submission.count({ where: { status: "PENDING" } }),
    prisma.submission.count({ where: { status: "APPROVED" } }),
    prisma.submission.count({ where: { status: "REJECTED" } }),
    prisma.earning.aggregate({
      where: { status: "PAID" },
      _sum: { amountCents: true },
    }),
    prisma.user.count({ where: { trustScore: { lt: 30 } } }),
    prisma.user.findMany({
      where: { role: "USER", status: "ACTIVE" },
      orderBy: [{ approvedCount: "desc" }],
      take: 5,
      select: {
        id: true,
        name: true,
        approvedCount: true,
        trustScore: true,
        totalEarned: true,
      },
    }),
    prisma.submission.findMany({
      where: { status: "PENDING" },
      orderBy: { submittedAt: "asc" },
      take: 5,
      include: {
        user: { select: { name: true, trustScore: true } },
        task: { select: { title: true, platform: true, rewardCents: true } },
      },
    }),
  ]);

  const total = approvedAgg + rejectedAgg;
  const approvalRate =
    total === 0 ? 0 : Math.round((approvedAgg / total) * 100);

  const cards = [
    {
      label: "Active campaigns",
      value: String(activeCampaigns),
      icon: Megaphone,
      href: "/admin/campaigns",
    },
    {
      label: "Active tasks",
      value: String(activeTasks),
      icon: ListChecks,
      href: "/admin/tasks",
    },
    {
      label: "Today's submissions",
      value: String(todaySubs),
      icon: Inbox,
      href: "/admin/submissions",
    },
    {
      label: "Pending reviews",
      value: String(pendingReviews),
      icon: Inbox,
      href: "/admin/submissions",
    },
    {
      label: "Approval rate",
      value: `${approvalRate}%`,
      icon: TrendingUp,
      href: "/admin/reports",
    },
    {
      label: "Total paid",
      value: formatMoney(totalPaidAgg._sum.amountCents ?? 0),
      icon: Wallet,
      href: "/admin/payouts",
    },
    {
      label: "Risky users (<30)",
      value: String(riskyUsersCount),
      icon: ShieldAlert,
      href: "/admin/users",
    },
    {
      label: "Top performers",
      value: String(topPerformers.length),
      icon: Users,
      href: "/admin/users",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Operations overview"
        description="A quick read on queue health and platform state."
      />

      <div className="grid gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="block">
            <Card className="transition-colors hover:bg-muted/40">
              <CardContent className="flex items-start justify-between gap-2 p-5">
                <div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="mt-1 text-xl font-semibold">{c.value}</p>
                </div>
                <c.icon className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Oldest pending submissions
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/submissions">Open queue</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {latestPending.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Queue is empty. Well done.
              </p>
            ) : (
              <ul className="divide-y">
                {latestPending.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {s.task.title}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <PlatformBadge platform={s.task.platform} />
                        <span>{s.user.name}</span>
                        <span>· trust {s.user.trustScore}</span>
                        <span>· {formatRelative(s.submittedAt)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {formatMoney(s.task.rewardCents)}
                      </span>
                      <SubmissionStatusBadge status={s.status} />
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/submissions/${s.id}`}>Review</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top performers</CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users yet.</p>
            ) : (
              <ul className="divide-y">
                {topPerformers.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.approvedCount} approved · trust {u.trustScore}
                      </p>
                    </div>
                    <span className="text-sm">
                      {formatMoney(u.totalEarned)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
