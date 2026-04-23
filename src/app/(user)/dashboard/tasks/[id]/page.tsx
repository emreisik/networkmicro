import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Hash, Link as LinkIcon, Tag, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import {
  PlatformBadge,
  TaskStatusBadge,
  SubmissionStatusBadge,
  AssignmentStatusBadge,
} from "@/components/common/status-badge";
import { ClaimButton } from "@/components/forms/claim-button";
import { SubmissionForm } from "@/components/forms/submission-form";
import { formatDateTime, formatMoney, formatRelative } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser();

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          brand: true,
          description: true,
          assets: true,
        },
      },
      assignments: {
        where: { userId: user.id },
        include: { submission: true },
      },
    },
  });
  if (!task) notFound();

  const mine = task.assignments[0] ?? null;
  const lastSubmission = mine?.submission ?? null;

  const socialAccounts = await prisma.socialAccount.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    select: { id: true, username: true, platform: true },
    orderBy: { createdAt: "desc" },
  });
  const socialOptions = socialAccounts.map((a) => ({
    id: a.id,
    label: `${a.platform} · @${a.username}`,
  }));

  const canClaim =
    !mine || mine.status === "CANCELLED" || mine.status === "EXPIRED";
  const canSubmit =
    mine && (mine.status === "CLAIMED" || mine.status === "REVISION_REQUESTED");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={task.title}
        description={
          task.campaign.name +
          (task.campaign.brand ? ` · ${task.campaign.brand}` : "")
        }
        action={
          <div className="flex items-center gap-2">
            <PlatformBadge platform={task.platform} />
            <TaskStatusBadge status={task.status} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {task.description ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {task.description}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {task.instructions ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">
                  {task.instructions}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {task.caption || task.hashtags || task.linkUrl ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Content to use</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {task.caption ? (
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                      Caption
                    </p>
                    <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                      {task.caption}
                    </p>
                  </div>
                ) : null}
                {task.hashtags ? (
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                      Hashtags
                    </p>
                    <p className="flex flex-wrap items-center gap-1 text-sm">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      {task.hashtags}
                    </p>
                  </div>
                ) : null}
                {task.linkUrl ? (
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                      Link
                    </p>
                    <a
                      href={task.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-sm underline-offset-4 hover:underline"
                    >
                      <LinkIcon className="h-3 w-3" />
                      {task.linkUrl}
                    </a>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {task.campaign.assets.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assets</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {task.campaign.assets.map((a) => (
                  <a
                    key={a.id}
                    href={a.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    {a.mimeType.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.fileUrl}
                        alt={a.title ?? "asset"}
                        className="h-32 w-full rounded-md border object-cover"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded-md border text-xs text-muted-foreground">
                        {a.mimeType}
                      </div>
                    )}
                    {a.title ? (
                      <p className="mt-1 truncate text-xs">{a.title}</p>
                    ) : null}
                  </a>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {canSubmit ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Submit proof</CardTitle>
              </CardHeader>
              <CardContent>
                <SubmissionForm
                  taskId={task.id}
                  requirePostUrl={task.requirePostUrl}
                  socialAccounts={socialOptions}
                  resubmit={mine?.status === "REVISION_REQUESTED"}
                />
              </CardContent>
            </Card>
          ) : null}

          {lastSubmission ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Your submission</CardTitle>
                <SubmissionStatusBadge status={lastSubmission.status} />
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={lastSubmission.screenshotUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={lastSubmission.screenshotUrl}
                      alt="submission"
                      className="w-full rounded-md border object-cover"
                    />
                  </a>
                  <div className="flex flex-col gap-2 text-xs">
                    {lastSubmission.postUrl ? (
                      <a
                        className="underline-offset-4 hover:underline"
                        href={lastSubmission.postUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open post URL
                      </a>
                    ) : null}
                    <p>
                      Submitted {formatRelative(lastSubmission.submittedAt)}
                    </p>
                    {lastSubmission.rejectReason ? (
                      <p>
                        <span className="text-destructive">Reject reason:</span>{" "}
                        {lastSubmission.rejectReason}
                      </p>
                    ) : null}
                    {lastSubmission.reviewNote ? (
                      <p>
                        <span className="text-muted-foreground">
                          Reviewer note:
                        </span>{" "}
                        {lastSubmission.reviewNote}
                      </p>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Reward</span>
                <span className="text-lg font-semibold">
                  {formatMoney(task.rewardCents)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Submission window
                </span>
                <span className="text-sm">
                  {task.submissionWindowHours} hours
                </span>
              </div>
              {task.maxAssignments > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Slots</span>
                  <span className="text-sm">
                    {task.assignedCount} / {task.maxAssignments}
                  </span>
                </div>
              ) : null}
              {task.endsAt ? (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Ends
                  </span>
                  <span className="text-sm">{formatDateTime(task.endsAt)}</span>
                </div>
              ) : null}
              {task.minFollowers > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    Min followers
                  </span>
                  <span className="text-sm">
                    {task.minFollowers.toLocaleString()}
                  </span>
                </div>
              ) : null}
              {task.minTrustScore > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Tag className="h-3 w-3" />
                    Min trust
                  </span>
                  <span className="text-sm">{task.minTrustScore}</span>
                </div>
              ) : null}
              {task.allowedAccountTypes.length > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Account types
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {task.allowedAccountTypes.map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 p-5">
              {mine ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Your assignment
                    </span>
                    <AssignmentStatusBadge status={mine.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Deadline
                    </span>
                    <span className="text-sm">
                      {formatDateTime(mine.deadlineAt)}
                    </span>
                  </div>
                </>
              ) : null}

              {canClaim ? <ClaimButton taskId={task.id} /> : null}

              {!canClaim && !canSubmit && mine ? (
                <Alert>
                  <AlertDescription className="text-xs">
                    This task is now closed for you. See{" "}
                    <Link href="/dashboard/submissions" className="underline">
                      your submissions
                    </Link>{" "}
                    for the outcome.
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
