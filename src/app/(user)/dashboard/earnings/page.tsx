import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { normalizePage, buildPageInfo } from "@/lib/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { EarningStatusBadge } from "@/components/common/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/format";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function EarningsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const sp = await searchParams;
  const { page, pageSize, skip, take } = normalizePage({
    page: Number(sp.page),
  });

  const [rows, total, agg] = await Promise.all([
    prisma.earning.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        submission: {
          include: { task: { select: { title: true, platform: true } } },
        },
        payoutItem: {
          include: { batch: { select: { name: true, id: true } } },
        },
      },
    }),
    prisma.earning.count({ where: { userId: user.id } }),
    prisma.earning.groupBy({
      by: ["status"],
      where: { userId: user.id },
      _sum: { amountCents: true },
    }),
  ]);

  const info = buildPageInfo(page, pageSize, total);

  const bucket: Record<string, number> = {
    PENDING: 0,
    LOCKED: 0,
    PAID: 0,
    CANCELLED: 0,
  };
  for (const a of agg) bucket[a.status] = a._sum.amountCents ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Earnings"
        description="Every approved submission yields an earning that settles in a payout batch."
      />

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Pending", v: bucket.PENDING! },
          { label: "Locked in batch", v: bucket.LOCKED! },
          { label: "Paid", v: bucket.PAID! },
          { label: "Balance", v: user.balance },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-lg font-semibold">{formatMoney(c.v)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No earnings yet"
                description="Your approved submissions will show here."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payout</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="font-medium">
                        {e.submission.task.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {e.submission.task.platform}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatMoney(e.amountCents)}
                    </TableCell>
                    <TableCell>
                      <EarningStatusBadge status={e.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {e.payoutItem?.batch?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(e.createdAt)}
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
