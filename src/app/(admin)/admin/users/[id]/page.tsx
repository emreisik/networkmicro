import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole, getCurrentUser } from "@/lib/auth/require";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, roleAtLeast } from "@/lib/rbac";
import { UserAdminForm } from "@/components/forms/user-admin-form";
import {
  UserStatusBadge,
  SubmissionStatusBadge,
  PlatformBadge,
} from "@/components/common/status-badge";
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatRelative,
} from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  const actor = await requireRole("ADMIN");
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      socialAccounts: true,
      submissions: {
        orderBy: { submittedAt: "desc" },
        take: 10,
        include: {
          task: { select: { title: true, platform: true, rewardCents: true } },
        },
      },
      trustScoreLogs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!user) notFound();

  const me = await getCurrentUser();
  const canChangeRole =
    roleAtLeast(actor.role, "SUPER_ADMIN") || !roleAtLeast(user.role, "ADMIN");
  const isSelf = me?.id === user.id;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={user.name}
        description={user.email}
        action={
          <div className="flex items-center gap-2">
            <UserStatusBadge status={user.status} />
            <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Admin controls</CardTitle>
          </CardHeader>
          <CardContent>
            {isSelf ? (
              <p className="text-sm text-muted-foreground">
                You cannot modify your own role or status from this panel.
              </p>
            ) : (
              <UserAdminForm
                canChangeRole={canChangeRole}
                defaults={{
                  id: user.id,
                  name: user.name,
                  role: user.role,
                  status: user.status,
                  dailyTaskLimit: user.dailyTaskLimit,
                  weeklyTaskLimit: user.weeklyTaskLimit,
                }}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stats</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Row label="Trust score" value={`${user.trustScore} / 100`} />
            <Row label="Balance" value={formatMoney(user.balance)} />
            <Row
              label="Lifetime earned"
              value={formatMoney(user.totalEarned)}
            />
            <Row label="Lifetime paid" value={formatMoney(user.totalPaid)} />
            <Row label="Approved" value={formatNumber(user.approvedCount)} />
            <Row label="Rejected" value={formatNumber(user.rejectedCount)} />
            <Row
              label="Current streak"
              value={formatNumber(user.currentStreak)}
            />
            <Row label="Joined" value={formatDate(user.createdAt)} />
            <Row
              label="Last active"
              value={
                user.lastActiveAt ? formatRelative(user.lastActiveAt) : "—"
              }
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {user.submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No submissions yet.
              </p>
            ) : (
              <ul className="divide-y">
                {user.submissions.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {s.task.title}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <PlatformBadge platform={s.task.platform} />
                        <span>{formatMoney(s.task.rewardCents)}</span>
                        <span>· {formatRelative(s.submittedAt)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <SubmissionStatusBadge status={s.status} />
                      <Button asChild size="xs" variant="outline">
                        <Link href={`/admin/submissions/${s.id}`}>View</Link>
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
            <CardTitle className="text-base">Trust history</CardTitle>
          </CardHeader>
          <CardContent>
            {user.trustScoreLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {user.trustScoreLogs.map((l) => (
                  <li key={l.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="truncate">{l.reason.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelative(l.createdAt)}
                      </p>
                    </div>
                    <span
                      className={
                        l.delta > 0
                          ? "font-medium text-success"
                          : l.delta < 0
                            ? "font-medium text-destructive"
                            : "text-muted-foreground"
                      }
                    >
                      {l.delta > 0 ? "+" : ""}
                      {l.delta} → {l.after}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Social accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {user.socialAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No social accounts.</p>
          ) : (
            <ul className="divide-y">
              {user.socialAccounts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={a.platform} />
                    <span className="font-medium">@{a.username}</span>
                    <Badge variant="outline">{a.accountType}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatNumber(a.followerCount)} followers ·{" "}
                    <a
                      className="underline-offset-4 hover:underline"
                      href={a.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {a.profileUrl}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
