import Link from "next/link";
import { Prisma, CampaignStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminArea } from "@/lib/auth/require";
import { normalizePage, buildPageInfo } from "@/lib/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { CampaignStatusBadge } from "@/components/common/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/format";

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}

export default async function CampaignsPage({ searchParams }: PageProps) {
  await requireAdminArea();
  const sp = await searchParams;
  const { page, pageSize, skip, take } = normalizePage({
    page: Number(sp.page),
  });
  const q = (sp.q ?? "").trim();

  const where: Prisma.CampaignWhereInput = {
    ...(sp.status ? { status: sp.status as CampaignStatus } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { _count: { select: { tasks: true } } },
    }),
    prisma.campaign.count({ where }),
  ]);

  const info = buildPageInfo(page, pageSize, total);
  const statuses: CampaignStatus[] = [
    "DRAFT",
    "SCHEDULED",
    "ACTIVE",
    "PAUSED",
    "COMPLETED",
    "ARCHIVED",
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Campaigns"
        description="Manage campaigns and their assets."
        action={
          <Button asChild>
            <Link href="/admin/campaigns/new">New campaign</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <form className="flex flex-col gap-2 sm:flex-row" method="get">
            <Input
              name="q"
              placeholder="Search name, slug, brand"
              defaultValue={q}
              className="sm:max-w-sm"
            />
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
                title="No campaigns yet"
                description="Create your first campaign to get started."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.slug}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.brand ?? "—"}
                    </TableCell>
                    <TableCell>
                      <CampaignStatusBadge status={c.status} />
                    </TableCell>
                    <TableCell>{c._count.tasks}</TableCell>
                    <TableCell className="text-sm">
                      {formatMoney(c.budgetCents)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/campaigns/${c.id}`}>Open</Link>
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
