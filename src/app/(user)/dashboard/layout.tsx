import Link from "next/link";
import { Bell } from "lucide-react";
import { requireUser } from "@/lib/auth/require";
import { DashboardShell } from "@/components/dashboard/shell";
import type { NavItem } from "@/components/dashboard/nav";
import { unreadCount } from "@/services/notification";
import { Badge } from "@/components/ui/badge";
import { isAdmin } from "@/lib/rbac";

const items: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "dashboard", exact: true },
  { href: "/dashboard/tasks", label: "Tasks", icon: "tasks" },
  { href: "/dashboard/submissions", label: "Submissions", icon: "submissions" },
  { href: "/dashboard/earnings", label: "Earnings", icon: "earnings" },
  {
    href: "/dashboard/social-accounts",
    label: "Social accounts",
    icon: "social",
  },
  {
    href: "/dashboard/notifications",
    label: "Notifications",
    icon: "notifications",
  },
  { href: "/dashboard/profile", label: "Profile", icon: "profile" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const unread = await unreadCount(user.id);

  return (
    <DashboardShell
      brandHref="/dashboard"
      brandLabel="Network Mikro"
      items={items}
      user={{ name: user.name, email: user.email, role: user.role }}
      headerRight={
        <div className="flex items-center gap-2">
          {unread > 0 ? (
            <Link
              href="/dashboard/notifications"
              className="inline-flex items-center gap-1"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary">{unread}</Badge>
            </Link>
          ) : null}
          {isAdmin(user.role) || user.role === "REVIEWER" ? (
            <Link
              href="/admin"
              className="hidden rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground md:inline-flex"
            >
              Admin area
            </Link>
          ) : null}
        </div>
      }
    >
      {children}
    </DashboardShell>
  );
}
