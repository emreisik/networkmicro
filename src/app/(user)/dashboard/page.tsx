import Link from "next/link";
import {
  ArrowRight,
  Coins,
  ClipboardList,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { formatMoney, formatRelative } from "@/lib/format";
import {
  SubmissionStatusBadge,
  PlatformBadge,
} from "@/components/common/status-badge";

export default async function DashboardHome() {
  const user = await requireUser();

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    openTaskCount,
    pendingSubmissions,
    weeklyEarningsAgg,
    recentSubs,
    notifications,
  ] = await Promise.all([
    prisma.task.count({
      where: {
        status: "OPEN",
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        minTrustScore: { lte: user.trustScore },
        NOT: {
          assignments: {
            some: { userId: user.id, status: { in: ["CLAIMED", "SUBMITTED"] } },
          },
        },
      },
    }),
    prisma.submission.count({ where: { userId: user.id, status: "PENDING" } }),
    prisma.earning.aggregate({
      where: { userId: user.id, createdAt: { gte: startOfWeek } },
      _sum: { amountCents: true },
    }),
    prisma.submission.findMany({
      where: { userId: user.id },
      orderBy: { submittedAt: "desc" },
      take: 5,
      include: {
        task: {
          select: { id: true, title: true, platform: true, rewardCents: true },
        },
      },
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const weekly = weeklyEarningsAgg._sum.amountCents ?? 0;

  const cards = [
    { label: "Balance", value: formatMoney(user.balance), icon: Coins },
    { label: "Weekly earnings", value: formatMoney(weekly), icon: TimerReset },
    { label: "Open tasks", value: String(openTaskCount), icon: ClipboardList },
    {
      label: "Trust score",
      value: `${user.trustScore} / 100`,
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description="Your task and earnings overview."
        action={
          <Button asChild>
            <Link href="/dashboard/tasks">
              Browse tasks <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-start justify-between gap-2 p-5">
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="mt-1 text-xl font-semibold">{c.value}</p>
              </div>
              <c.icon className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent submissions</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/submissions">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentSubs.length === 0 ? (
              <EmptyState
                title="No submissions yet"
                description="Claim a task and submit proof to see it here."
                action={
                  <Button asChild>
                    <Link href="/dashboard/tasks">Browse tasks</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y">
                {recentSubs.map((s) => (
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
                        <span>{formatRelative(s.submittedAt)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatMoney(s.task.rewardCents)}
                      </span>
                      <SubmissionStatusBadge status={s.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Notifications</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/notifications">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <EmptyState
                title="No notifications"
                description="You're all caught up."
              />
            ) : (
              <ul className="space-y-3">
                {notifications.map((n) => (
                  <li key={n.id} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {n.body}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {formatRelative(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-5">
            <div>
              <p className="text-sm font-medium">Pending submissions</p>
              <p className="text-xs text-muted-foreground">
                Waiting for review.
              </p>
            </div>
            <span className="text-2xl font-semibold">{pendingSubmissions}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-5">
            <div>
              <p className="text-sm font-medium">Approved / Rejected</p>
              <p className="text-xs text-muted-foreground">Lifetime counts.</p>
            </div>
            <span className="text-sm">
              <span className="text-success">{user.approvedCount}</span>
              {" / "}
              <span className="text-destructive">{user.rejectedCount}</span>
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
