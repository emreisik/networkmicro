import Link from "next/link";
import { Prisma, Role, UserStatus } from "@prisma/client";
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
import { UserStatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/rbac";
import { formatMoney, formatRelative } from "@/lib/format";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    q?: string;
    role?: string;
    status?: string;
  }>;
}

export default async function UsersAdminPage({ searchParams }: PageProps) {
  await requireAdminArea();
  const sp = await searchParams;
  const { page, pageSize, skip, take } = normalizePage({
    page: Number(sp.page),
  });
  const q = (sp.q ?? "").trim();

  const where: Prisma.UserWhereInput = {
    ...(sp.role ? { role: sp.role as Role } : {}),
    ...(sp.status ? { status: sp.status as UserStatus } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        trustScore: true,
        totalEarned: true,
        approvedCount: true,
        rejectedCount: true,
        lastActiveAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  const info = buildPageInfo(page, pageSize, total);
  const roles: Role[] = ["SUPER_ADMIN", "ADMIN", "REVIEWER", "BRAND", "USER"];
  const statuses: UserStatus[] = [
    "ACTIVE",
    "SUSPENDED",
    "BANNED",
    "PENDING_VERIFICATION",
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Users"
        description="Manage users, roles, and status."
      />

      <Card>
        <CardContent className="p-4">
          <form className="flex flex-col gap-2 sm:flex-row" method="get">
            <Input
              name="q"
              placeholder="Search name or email"
              defaultValue={q}
              className="sm:max-w-sm"
            />
            <select
              name="role"
              defaultValue={sp.role ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
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
              <EmptyState title="No users match" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trust</TableHead>
                  <TableHead>Approved/Rejected</TableHead>
                  <TableHead>Earned</TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {u.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ROLE_LABELS[u.role]}</Badge>
                    </TableCell>
                    <TableCell>
                      <UserStatusBadge status={u.status} />
                    </TableCell>
                    <TableCell>{u.trustScore}</TableCell>
                    <TableCell className="text-sm">
                      <span className="text-success">{u.approvedCount}</span>
                      {" / "}
                      <span className="text-destructive">
                        {u.rejectedCount}
                      </span>
                    </TableCell>
                    <TableCell>{formatMoney(u.totalEarned)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.lastActiveAt ? formatRelative(u.lastActiveAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/users/${u.id}`}>Open</Link>
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
