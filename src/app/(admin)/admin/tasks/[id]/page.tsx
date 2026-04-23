import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import {
  TaskStatusBadge,
  PlatformBadge,
  SubmissionStatusBadge,
} from "@/components/common/status-badge";
import { TaskForm } from "@/components/forms/task-form";
import { formatMoney, formatRelative } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailAdminPage({ params }: PageProps) {
  await requireRole("ADMIN");
  const { id } = await params;

  const [task, campaigns] = await Promise.all([
    prisma.task.findUnique({
      where: { id },
      include: {
        campaign: { select: { id: true, name: true } },
        submissions: {
          orderBy: { submittedAt: "desc" },
          take: 10,
          include: { user: { select: { name: true } } },
        },
      },
    }),
    prisma.campaign.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!task) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={task.title}
        description={task.campaign.name}
        action={
          <div className="flex items-center gap-2">
            <PlatformBadge platform={task.platform} />
            <TaskStatusBadge status={task.status} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Task</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskForm
              mode="edit"
              campaigns={campaigns}
              defaults={{
                id: task.id,
                campaignId: task.campaignId,
                title: task.title,
                description: task.description,
                platform: task.platform,
                action: task.action,
                status: task.status,
                rewardCents: task.rewardCents,
                requireScreenshot: task.requireScreenshot,
                requirePostUrl: task.requirePostUrl,
                requireCaption: task.requireCaption,
                minFollowers: task.minFollowers,
                minTrustScore: task.minTrustScore,
                allowedAccountTypes: task.allowedAccountTypes,
                maxAssignments: task.maxAssignments,
                submissionWindowHours: task.submissionWindowHours,
                startsAt: task.startsAt,
                endsAt: task.endsAt,
                instructions: task.instructions,
                caption: task.caption,
                hashtags: task.hashtags,
                linkUrl: task.linkUrl,
              }}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stats</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Row label="Reward" value={formatMoney(task.rewardCents)} />
              <Row label="Claimed" value={String(task.assignedCount)} />
              <Row label="Approved" value={String(task.approvedCount)} />
              <Row
                label="Slots"
                value={
                  task.maxAssignments === 0
                    ? "Unlimited"
                    : `${task.assignedCount} / ${task.maxAssignments}`
                }
              />
              <Row label="Window" value={`${task.submissionWindowHours} h`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent submissions</CardTitle>
            </CardHeader>
            <CardContent>
              {task.submissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No submissions yet.
                </p>
              ) : (
                <ul className="divide-y text-sm">
                  {task.submissions.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-2 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate">{s.user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelative(s.submittedAt)}
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
        </div>
      </div>
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
