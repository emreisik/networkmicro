import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require";
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
import {
  PayoutBatchStatusBadge,
  PayoutItemStatusBadge,
} from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import {
  MarkItemPaidForm,
  MarkBatchPaidButton,
  CancelBatchButton,
} from "@/components/forms/payout-item-buttons";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PayoutDetailPage({ params }: PageProps) {
  await requireRole("ADMIN");
  const { id } = await params;

  const batch = await prisma.payoutBatch.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          earnings: {
            select: { id: true, amountCents: true, submissionId: true },
          },
        },
        orderBy: { amountCents: "desc" },
      },
    },
  });
  if (!batch) notFound();

  const remaining = batch.items.filter((i) => i.status === "PENDING").length;
  const canEdit = batch.status === "OPEN" || batch.status === "DRAFT";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={batch.name}
        description={`${formatDate(batch.periodStart)} – ${formatDate(batch.periodEnd)}`}
        action={
          <div className="flex items-center gap-2">
            <PayoutBatchStatusBadge status={batch.status} />
            {canEdit && remaining > 0 ? (
              <MarkBatchPaidButton batchId={batch.id} />
            ) : null}
            {canEdit ? <CancelBatchButton batchId={batch.id} /> : null}
            <Button asChild variant="outline">
              <Link href="/admin/payouts">Back</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Total", v: formatMoney(batch.totalCents) },
          { label: "Items", v: String(batch.itemCount) },
          { label: "Pending", v: String(remaining) },
          {
            label: "Paid at",
            v: batch.paidAt ? formatDateTime(batch.paidAt) : "—",
          },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-lg font-semibold">{c.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Earnings</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Paid at</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batch.items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <div className="font-medium">{i.user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {i.user.email}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {i.earnings.length}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatMoney(i.amountCents)}
                  </TableCell>
                  <TableCell>
                    <PayoutItemStatusBadge status={i.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {i.reference ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {i.paidAt ? formatDateTime(i.paidAt) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {i.status === "PENDING" ? (
                      <MarkItemPaidForm itemId={i.id} />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
