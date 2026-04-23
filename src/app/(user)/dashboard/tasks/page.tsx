import Link from "next/link";
import { Prisma, Platform } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { normalizePage, buildPageInfo } from "@/lib/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatMoney, formatRelative } from "@/lib/format";

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; platform?: string }>;
}

export default async function TasksPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const sp = await searchParams;
  const { page, pageSize, skip, take } = normalizePage({
    page: Number(sp.page),
  });
  const q = (sp.q ?? "").trim();
  const platform = sp.platform as Platform | undefined;

  const now = new Date();
  const where: Prisma.TaskWhereInput = {
    status: "OPEN",
    OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    minTrustScore: { lte: user.trustScore },
    AND: [
      platform ? { platform } : {},
      q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { campaign: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take,
      include: {
        campaign: { select: { name: true, brand: true } },
        assignments: {
          where: { userId: user.id },
          select: { status: true },
          take: 1,
        },
      },
    }),
    prisma.task.count({ where }),
  ]);

  const info = buildPageInfo(page, pageSize, total);
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
        title="Available tasks"
        description="Pick a task, complete it on your social account, and submit proof."
      />

      <Card>
        <CardContent className="p-4">
          <form
            className="flex flex-col items-stretch gap-2 sm:flex-row"
            method="get"
          >
            <Input
              name="q"
              placeholder="Search title or campaign"
              defaultValue={q}
              className="sm:max-w-sm"
            />
            <select
              name="platform"
              defaultValue={platform ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All platforms</option>
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {p}
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
                title="No tasks match"
                description="Try adjusting your filters or check back later."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => {
                  const mine = t.assignments[0]?.status;
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-medium">{t.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.campaign.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <PlatformBadge platform={t.platform} />
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatMoney(t.rewardCents)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.endsAt ? formatRelative(t.endsAt) : "No deadline"}
                      </TableCell>
                      <TableCell>
                        {mine ? (
                          <span className="text-xs text-muted-foreground">
                            You: {mine.replace(/_/g, " ")}
                          </span>
                        ) : (
                          <TaskStatusBadge status={t.status} />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/tasks/${t.id}`}>Open</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={info.page} totalPages={info.totalPages} />
    </div>
  );
}
