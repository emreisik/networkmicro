import Link from "next/link";
import { Prisma, Platform, SubmissionStatus } from "@prisma/client";
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
  SubmissionStatusBadge,
  PlatformBadge,
} from "@/components/common/status-badge";
import { formatMoney, formatRelative } from "@/lib/format";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: SubmissionStatus;
    platform?: Platform;
    minScore?: string;
    maxScore?: string;
    flagged?: string;
  }>;
}

export default async function AdminSubmissionsPage({
  searchParams,
}: PageProps) {
  await requireAdminArea();
  const sp = await searchParams;
  const { page, pageSize, skip, take } = normalizePage({
    page: Number(sp.page),
  });

  const q = (sp.q ?? "").trim();
  const status: SubmissionStatus = sp.status ?? "PENDING";
  const minScore = Number(sp.minScore) || undefined;
  const maxScore = Number(sp.maxScore) || undefined;

  const userFilters: Prisma.UserWhereInput = {};
  if (minScore !== undefined || maxScore !== undefined) {
    userFilters.trustScore = {
      ...(minScore !== undefined ? { gte: minScore } : {}),
      ...(maxScore !== undefined ? { lte: maxScore } : {}),
    };
  }

  const where: Prisma.SubmissionWhereInput = {
    status,
    ...(sp.platform ? { task: { platform: sp.platform } } : {}),
    ...(sp.flagged === "1" ? { flagged: true } : {}),
    ...(q
      ? {
          OR: [
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
            { task: { title: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(Object.keys(userFilters).length ? { user: userFilters } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      orderBy: { submittedAt: "asc" },
      skip,
      take,
      include: {
        user: { select: { id: true, name: true, trustScore: true } },
        task: {
          select: { id: true, title: true, platform: true, rewardCents: true },
        },
      },
    }),
    prisma.submission.count({ where }),
  ]);

  const info = buildPageInfo(page, pageSize, total);
  const statuses: SubmissionStatus[] = [
    "PENDING",
    "APPROVED",
    "REJECTED",
    "REVISION_REQUESTED",
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
        title="Review queue"
        description="Review submissions in FIFO order. Keep it tight."
      />

      <Card>
        <CardContent className="p-4">
          <form className="grid grid-cols-1 gap-2 md:grid-cols-6" method="get">
            <Input
              name="q"
              placeholder="Search user or task"
              defaultValue={q}
              className="md:col-span-2"
            />
            <select
              name="status"
              defaultValue={status}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
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
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                name="minScore"
                defaultValue={sp.minScore ?? ""}
                placeholder="Min score"
              />
              <Input
                type="number"
                min={0}
                max={100}
                name="maxScore"
                defaultValue={sp.maxScore ?? ""}
                placeholder="Max score"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="flagged"
                value="1"
                defaultChecked={sp.flagged === "1"}
              />
              Flagged only
            </label>
            <Button
              type="submit"
              variant="outline"
              className="md:col-span-6 md:w-fit"
            >
              Apply filters
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Nothing to review"
                description="Try adjusting filters or check back later."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Screenshot</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <a
                        href={s.screenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.screenshotUrl}
                          alt="proof"
                          className="h-14 w-14 rounded-md border object-cover"
                        />
                      </a>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{s.user.name}</div>
                      <div className="text-xs text-muted-foreground">
                        trust {s.user.trustScore}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {s.task.title}
                    </TableCell>
                    <TableCell>
                      <PlatformBadge platform={s.task.platform} />
                    </TableCell>
                    <TableCell>{formatMoney(s.task.rewardCents)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelative(s.submittedAt)}
                    </TableCell>
                    <TableCell>
                      <SubmissionStatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm">
                        <Link href={`/admin/submissions/${s.id}`}>Review</Link>
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
