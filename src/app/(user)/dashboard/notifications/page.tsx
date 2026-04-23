import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { normalizePage, buildPageInfo } from "@/lib/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/format";
import { markAllReadAction } from "./actions";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const sp = await searchParams;
  const { page, pageSize, skip, take } = normalizePage({
    page: Number(sp.page),
  });

  const [rows, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.notification.count({ where: { userId: user.id } }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  const info = buildPageInfo(page, pageSize, total);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Notifications"
        description={`${unread} unread`}
        action={
          <form action={markAllReadAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={unread === 0}
            >
              Mark all as read
            </Button>
          </form>
        }
      />

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No notifications"
                description="We will notify you when something changes."
              />
            </div>
          ) : (
            <ul className="divide-y">
              {rows.map((n) => (
                <li
                  key={n.id}
                  className="flex items-start justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      {!n.readAt ? <Badge variant="warning">New</Badge> : null}
                    </div>
                    {n.body ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {n.body}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {formatRelative(n.createdAt)}
                    </p>
                  </div>
                  {n.linkUrl ? (
                    <Button asChild variant="ghost" size="sm">
                      <Link href={n.linkUrl}>Open</Link>
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Pagination page={info.page} totalPages={info.totalPages} />
    </div>
  );
}
