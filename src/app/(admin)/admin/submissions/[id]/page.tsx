import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminArea } from "@/lib/auth/require";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  SubmissionStatusBadge,
  PlatformBadge,
  UserStatusBadge,
} from "@/components/common/status-badge";
import { ReviewForm } from "@/components/forms/review-form";
import {
  formatDateTime,
  formatMoney,
  formatNumber,
  formatRelative,
} from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SubmissionDetailPage({ params }: PageProps) {
  await requireAdminArea();
  const { id } = await params;

  const s = await prisma.submission.findUnique({
    where: { id },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          platform: true,
          rewardCents: true,
          requirePostUrl: true,
          campaign: { select: { id: true, name: true, brand: true } },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          trustScore: true,
          approvedCount: true,
          rejectedCount: true,
          totalEarned: true,
          createdAt: true,
        },
      },
      socialAccount: true,
      reviewer: { select: { name: true, email: true } },
    },
  });
  if (!s) notFound();

  const canReview = s.status === "PENDING";

  const userRecent = await prisma.submission.findMany({
    where: { userId: s.user.id, NOT: { id: s.id } },
    orderBy: { submittedAt: "desc" },
    take: 5,
    include: { task: { select: { title: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Review submission"
        description={s.task.title}
        action={
          <Button asChild variant="outline">
            <Link href="/admin/submissions">Back to queue</Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardContent className="p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.screenshotUrl}
                alt="proof"
                className="w-full rounded-md border object-contain"
              />
            </CardContent>
          </Card>

          {s.postUrl || s.note ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">User provided</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {s.postUrl ? (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Post URL
                    </p>
                    <a
                      href={s.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline-offset-4 hover:underline break-all"
                    >
                      {s.postUrl}
                    </a>
                  </div>
                ) : null}
                {s.note ? (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Note
                    </p>
                    <p className="whitespace-pre-wrap">{s.note}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {canReview ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Review decision</CardTitle>
              </CardHeader>
              <CardContent>
                <ReviewForm submissionId={s.id} />
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertDescription>
                Reviewed by {s.reviewer?.name ?? "—"} on{" "}
                {s.reviewedAt ? formatDateTime(s.reviewedAt) : "—"}.
                {s.rejectReason ? ` Reason: ${s.rejectReason}` : ""}
                {s.reviewNote ? ` Note: ${s.reviewNote}` : ""}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submission</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Row
                label="Status"
                value={<SubmissionStatusBadge status={s.status} />}
              />
              <Row
                label="Platform"
                value={<PlatformBadge platform={s.task.platform} />}
              />
              <Row label="Reward" value={formatMoney(s.task.rewardCents)} />
              <Row label="Campaign" value={s.task.campaign.name} />
              <Row label="Submitted" value={formatRelative(s.submittedAt)} />
              {s.flagged ? (
                <Row
                  label="Risk"
                  value={<Badge variant="destructive">Flagged</Badge>}
                />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">User</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/admin/users/${s.user.id}`}>Open profile</Link>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Row label="Name" value={s.user.name} />
              <Row label="Email" value={s.user.email} />
              <Row
                label="Status"
                value={<UserStatusBadge status={s.user.status} />}
              />
              <Row label="Trust" value={`${s.user.trustScore} / 100`} />
              <Row
                label="Approved"
                value={formatNumber(s.user.approvedCount)}
              />
              <Row
                label="Rejected"
                value={formatNumber(s.user.rejectedCount)}
              />
              <Row
                label="Lifetime earned"
                value={formatMoney(s.user.totalEarned)}
              />
              <Row label="Joined" value={formatDateTime(s.user.createdAt)} />
            </CardContent>
          </Card>

          {s.socialAccount ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Social account</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <Row
                  label="Platform"
                  value={<PlatformBadge platform={s.socialAccount.platform} />}
                />
                <Row label="Username" value={`@${s.socialAccount.username}`} />
                <Row
                  label="Followers"
                  value={formatNumber(s.socialAccount.followerCount)}
                />
                <Row label="Type" value={s.socialAccount.accountType} />
                <Row
                  label="Profile"
                  value={
                    <a
                      href={s.socialAccount.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline-offset-4 hover:underline"
                    >
                      Open
                    </a>
                  }
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent history</CardTitle>
            </CardHeader>
            <CardContent>
              {userRecent.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No prior submissions.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {userRecent.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between"
                    >
                      <span className="truncate">{r.task.title}</span>
                      <SubmissionStatusBadge status={r.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
