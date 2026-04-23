import { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require";
import { normalizePage, buildPageInfo } from "@/lib/pagination";
import { Card, CardContent } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    q?: string;
    action?: string;
    entity?: string;
  }>;
}

export default async function LogsPage({ searchParams }: PageProps) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const { page, pageSize, skip, take } = normalizePage({
    page: Number(sp.page),
    pageSize: 50,
  });

  const where: Prisma.AuditLogWhereInput = {
    ...(sp.action ? { action: sp.action as AuditAction } : {}),
    ...(sp.entity ? { entityType: sp.entity } : {}),
    ...(sp.q ? { entityId: sp.q } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { actor: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const info = buildPageInfo(page, pageSize, total);
  const actions = Object.values(AuditAction);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Audit logs"
        description="Every important action is recorded here."
      />

      <Card>
        <CardContent className="p-4">
          <form className="grid grid-cols-1 gap-2 md:grid-cols-4" method="get">
            <Input name="q" placeholder="Entity ID" defaultValue={sp.q ?? ""} />
            <Input
              name="entity"
              placeholder="Entity type (User, Submission, …)"
              defaultValue={sp.entity ?? ""}
            />
            <select
              name="action"
              defaultValue={sp.action ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a}
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
              <EmptyState title="No logs match" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(l.createdAt)}
                    </TableCell>
                    <TableCell>
                      {l.actor ? (
                        <div>
                          <div className="text-sm font-medium">
                            {l.actor.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {l.actor.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          system
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{l.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{l.entityType}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {l.entityId ?? "—"}
                    </TableCell>
                    <TableCell>
                      <pre className="max-w-sm overflow-x-auto whitespace-pre-wrap break-all text-[11px] text-muted-foreground">
                        {l.metadata ? JSON.stringify(l.metadata) : "—"}
                      </pre>
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
