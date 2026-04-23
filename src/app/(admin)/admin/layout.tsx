import Link from "next/link";
import { requireAdminArea } from "@/lib/auth/require";
import { DashboardShell } from "@/components/dashboard/shell";
import type { NavItem } from "@/components/dashboard/nav";
import { isAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

const baseItems: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "dashboard", exact: true },
  { href: "/admin/submissions", label: "Review queue", icon: "review" },
  { href: "/admin/campaigns", label: "Campaigns", icon: "campaigns" },
  { href: "/admin/tasks", label: "Tasks", icon: "tasks" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/payouts", label: "Payouts", icon: "earnings" },
  { href: "/admin/reports", label: "Reports", icon: "reports" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminArea();

  const pendingCount = await prisma.submission.count({
    where: { status: "PENDING" },
  });

  const items: NavItem[] = [
    ...baseItems,
    ...(isAdmin(user.role)
      ? ([
          { href: "/admin/settings", label: "Settings", icon: "settings" },
          { href: "/admin/logs", label: "Audit logs", icon: "logs" },
        ] satisfies NavItem[])
      : []),
  ];

  return (
    <DashboardShell
      brandHref="/admin"
      brandLabel="Network Mikro · Admin"
      items={items}
      user={{ name: user.name, email: user.email, role: user.role }}
      headerRight={
        <div className="flex items-center gap-2">
          {pendingCount > 0 ? (
            <Link
              href="/admin/submissions"
              className="inline-flex items-center gap-1 text-sm"
            >
              <span className="text-muted-foreground">Queue</span>
              <Badge variant="warning">{pendingCount}</Badge>
            </Link>
          ) : null}
          <Link
            href="/dashboard"
            className="hidden rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground md:inline-flex"
          >
            User area
          </Link>
        </div>
      }
    >
      {children}
    </DashboardShell>
  );
}
