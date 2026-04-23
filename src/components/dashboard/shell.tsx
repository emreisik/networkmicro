import Link from "next/link";
import { UserMenu } from "@/components/dashboard/user-menu";
import { Nav, type NavItem } from "@/components/dashboard/nav";
import type { Role } from "@prisma/client";

interface ShellProps {
  brandHref: string;
  brandLabel: string;
  items: NavItem[];
  user: { name: string; email: string; role: Role };
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardShell({
  brandHref,
  brandLabel,
  items,
  user,
  headerRight,
  children,
}: ShellProps) {
  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-60 shrink-0 border-r bg-background md:flex md:flex-col">
        <div className="flex h-14 items-center border-b px-4">
          <Link
            href={brandHref}
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            {brandLabel}
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <Nav items={items} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
          <Link href={brandHref} className="font-semibold md:hidden">
            {brandLabel}
          </Link>
          <div className="ml-auto flex items-center gap-3">
            {headerRight}
            <UserMenu name={user.name} email={user.email} role={user.role} />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
