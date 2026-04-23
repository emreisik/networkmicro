import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminArea } from "@/lib/auth/require";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";

interface PageProps {
  searchParams: Promise<{ start?: string; end?: string }>;
}

function toDate(v: string | undefined, fallback: Date): Date {
  if (!v) return fallback;
  const d = new Date(v);
  return isNaN(d.getTime()) ? fallback : d;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  await requireAdminArea();
  const sp = await searchParams;

  const now = new Date();
  const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const start = toDate(sp.start, defaultStart);
  const end = toDate(sp.end, now);

  const subWhere: Prisma.SubmissionWhereInput = {
    submittedAt: { gte: start, lte: end },
  };
  const earnWhere: Prisma.EarningWhereInput = {
    createdAt: { gte: start, lte: end },
  };

  const [
    approvedCount,
    rejectedCount,
    pendingCount,
    revisionCount,
    byCampaign,
    byPlatform,
    topUsers,
    lowTrust,
  ] = await Promise.all([
    prisma.submission.count({ where: { ...subWhere, status: "APPROVED" } }),
    prisma.submission.count({ where: { ...subWhere, status: "REJECTED" } }),
    prisma.submission.count({ where: { ...subWhere, status: "PENDING" } }),
    prisma.submission.count({
      where: { ...subWhere, status: "REVISION_REQUESTED" },
    }),
    prisma.task.groupBy({
      by: ["campaignId"],
      _count: { id: true },
      where: { submissions: { some: subWhere } },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    prisma.submission.groupBy({
      by: ["status"],
      where: subWhere,
      _count: { id: true },
    }),
    prisma.earning.groupBy({
      by: ["userId"],
      _sum: { amountCents: true },
      where: earnWhere,
      orderBy: { _sum: { amountCents: "desc" } },
      take: 10,
    }),
    prisma.user.findMany({
      where: { trustScore: { lt: 30 } },
      orderBy: { trustScore: "asc" },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        trustScore: true,
        rejectedCount: true,
      },
    }),
  ]);

  const total = approvedCount + rejectedCount;
  const approvalRate =
    total === 0 ? 0 : Math.round((approvedCount / total) * 100);

  const topUserIds = topUsers.map((u) => u.userId);
  const userMap = new Map(
    (
      await prisma.user.findMany({
        where: { id: { in: topUserIds } },
        select: { id: true, name: true, email: true },
      })
    ).map((u) => [u.id, u]),
  );

  const campaignIds = byCampaign.map((c) => c.campaignId);
  const campaignMap = new Map(
    (
      await prisma.campaign.findMany({
        where: { id: { in: campaignIds } },
        select: { id: true, name: true },
      })
    ).map((c) => [c.id, c]),
  );

  const toInputDate = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description={`${formatDate(start)} – ${formatDate(end)}`}
      />

      <Card>
        <CardContent className="p-4">
          <form
            className="flex flex-col items-end gap-2 sm:flex-row"
            method="get"
          >
            <div className="flex flex-1 gap-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">From</label>
                <Input
                  type="date"
                  name="start"
                  defaultValue={toInputDate(start)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">To</label>
                <Input type="date" name="end" defaultValue={toInputDate(end)} />
              </div>
            </div>
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Approved", v: formatNumber(approvedCount) },
          { label: "Rejected", v: formatNumber(rejectedCount) },
          { label: "Pending", v: formatNumber(pendingCount) },
          { label: "Revision", v: formatNumber(revisionCount) },
          { label: "Approval rate", v: `${approvalRate}%` },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-lg font-semibold">{c.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submissions by campaign</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-right">
                    Tasks with submissions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byCampaign.map((c) => (
                  <TableRow key={c.campaignId}>
                    <TableCell>
                      {campaignMap.get(c.campaignId)?.name ?? c.campaignId}
                    </TableCell>
                    <TableCell className="text-right">{c._count.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Platform mix (submissions)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byPlatform.map((p) => (
                  <TableRow key={p.status}>
                    <TableCell>
                      <Badge variant="outline">{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{p._count.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top earners</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUsers.map((u) => (
                  <TableRow key={u.userId}>
                    <TableCell>
                      <div className="font-medium">
                        {userMap.get(u.userId)?.name ?? u.userId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {userMap.get(u.userId)?.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(u._sum.amountCents ?? 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Low trust users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Trust</TableHead>
                  <TableHead className="text-right">Rejected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowTrust.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {u.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{u.trustScore}</TableCell>
                    <TableCell className="text-right text-sm">
                      {u.rejectedCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
