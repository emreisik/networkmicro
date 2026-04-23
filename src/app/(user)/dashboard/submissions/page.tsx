import Link from "next/link";
import { Prisma, SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { normalizePage, buildPageInfo } from "@/lib/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import {
  SubmissionStatusBadge,
  PlatformBadge,
} from "@/components/common/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatMoney } from "@/lib/format";

interface PageProps {
  searchParams: Promise<{ page?: string; status?: string }>;
}

export default async function SubmissionsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const sp = await searchParams;
  const { page, pageSize, skip, take } = normalizePage({
    page: Number(sp.page),
  });
  const status = (sp.status as SubmissionStatus | undefined) || undefined;

  const where: Prisma.SubmissionWhereInput = {
    userId: user.id,
    ...(status ? { status } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      skip,
      take,
      include: {
        task: {
          select: { id: true, title: true, platform: true, rewardCents: true },
        },
        earning: { select: { amountCents: true, status: true } },
      },
    }),
    prisma.submission.count({ where }),
  ]);

  const info = buildPageInfo(page, pageSize, total);
  const tabs: { key: string; label: string }[] = [
    { key: "", label: "All" },
    { key: "PENDING", label: "Pending" },
    { key: "APPROVED", label: "Approved" },
    { key: "REJECTED", label: "Rejected" },
    { key: "REVISION_REQUESTED", label: "Revision" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Your submissions"
        description="Track the status of each submission."
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const selected = (status ?? "") === t.key;
          const href = t.key
            ? `/dashboard/submissions?status=${t.key}`
            : `/dashboard/submissions`;
          return (
            <Button
              key={t.label}
              asChild
              size="sm"
              variant={selected ? "default" : "outline"}
            >
              <Link href={href}>{t.label}</Link>
            </Button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No submissions"
                description="Claim a task, complete it, and submit proof."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.task.title}</div>
                      {s.earning ? (
                        <div className="text-xs text-muted-foreground">
                          Earning: {formatMoney(s.earning.amountCents)} ·{" "}
                          {s.earning.status}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <PlatformBadge platform={s.task.platform} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(s.submittedAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatMoney(s.task.rewardCents)}
                    </TableCell>
                    <TableCell>
                      <SubmissionStatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/tasks/${s.task.id}`}>
                          Open task
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={info.page} totalPages={info.totalPages} />
    </div>
  );
}
