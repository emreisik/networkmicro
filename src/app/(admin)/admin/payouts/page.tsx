import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdminArea } from "@/lib/auth/require";
import { normalizePage, buildPageInfo } from "@/lib/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { PayoutBatchStatusBadge } from "@/components/common/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDate, formatMoney } from "@/lib/format";
import { PayoutBatchForm } from "@/components/forms/payout-batch-form";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function PayoutsPage({ searchParams }: PageProps) {
  await requireAdminArea();
  const sp = await searchParams;
  const { page, pageSize, skip, take } = normalizePage({
    page: Number(sp.page),
  });

  const [rows, total, pendingAgg] = await Promise.all([
    prisma.payoutBatch.findMany({ orderBy: { createdAt: "desc" }, skip, take }),
    prisma.payoutBatch.count(),
    prisma.earning.aggregate({
      where: { status: "PENDING" },
      _sum: { amountCents: true },
    }),
  ]);

  const info = buildPageInfo(page, pageSize, total);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Payouts"
        description={`${formatMoney(pendingAgg._sum.amountCents ?? 0)} pending across approved earnings`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New batch</CardTitle>
        </CardHeader>
        <CardContent>
          <PayoutBatchForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No payout batches"
                description="Create one to group eligible earnings for payment."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(b.periodStart)} – {formatDate(b.periodEnd)}
                    </TableCell>
                    <TableCell>
                      <PayoutBatchStatusBadge status={b.status} />
                    </TableCell>
                    <TableCell>{b.itemCount}</TableCell>
                    <TableCell className="font-medium">
                      {formatMoney(b.totalCents)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/payouts/${b.id}`}>Open</Link>
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
