import Link from "next/link";
import { Prisma, Platform, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminArea } from "@/lib/auth/require";
import { normalizePage, buildPageInfo } from "@/lib/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PlatformBadge,
  TaskStatusBadge,
} from "@/components/common/status-badge";
import { formatMoney } from "@/lib/format";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    q?: string;
    platform?: string;
    status?: string;
  }>;
}

export default async function AdminTasksPage({ searchParams }: PageProps) {
  await requireAdminArea();
  const sp = await searchParams;
  const { page, pageSize, skip, take } = normalizePage({
    page: Number(sp.page),
  });
  const q = (sp.q ?? "").trim();

  const where: Prisma.TaskWhereInput = {
    ...(sp.status ? { status: sp.status as TaskStatus } : {}),
    ...(sp.platform ? { platform: sp.platform as Platform } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { campaign: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { campaign: { select: { name: true } } },
    }),
    prisma.task.count({ where }),
  ]);

  const info = buildPageInfo(page, pageSize, total);
  const statuses: TaskStatus[] = [
    "DRAFT",
    "OPEN",
    "PAUSED",
    "FULL",
    "EXPIRED",
    "ARCHIVED",
  ];
  const platforms: Platform[] = [
    "INSTAGRAM",
    "TIKTOK",
    "YOUTUBE",
    "X",
    "FACEBOOK",
    "LINKEDIN",
    "THREADS",
    "OTHER",
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tasks"
        description="All tasks across campaigns."
        action={
          <Button asChild>
            <Link href="/admin/tasks/new">New task</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <form className="flex flex-col gap-2 sm:flex-row" method="get">
            <Input
              name="q"
              placeholder="Search title or campaign"
              defaultValue={q}
              className="sm:max-w-sm"
            />
            <select
              name="platform"
              defaultValue={sp.platform ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All platforms</option>
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={sp.status ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No tasks yet"
                description="Create your first task."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="max-w-xs truncate font-medium">
                      {t.title}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.campaign.name}
                    </TableCell>
                    <TableCell>
                      <PlatformBadge platform={t.platform} />
                    </TableCell>
                    <TableCell>{formatMoney(t.rewardCents)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.approvedCount} / {t.assignedCount} /{" "}
                      {t.maxAssignments || "∞"}
                    </TableCell>
                    <TableCell>
                      <TaskStatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/tasks/${t.id}`}>Open</Link>
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
