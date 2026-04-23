"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type LucideIcon,
  LayoutDashboard,
  ListChecks,
  FileText,
  Wallet,
  UserCog,
  Share2,
  Bell,
  Megaphone,
  Inbox,
  Users,
  BarChart3,
  Settings2,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavIcon =
  | "dashboard"
  | "tasks"
  | "submissions"
  | "earnings"
  | "profile"
  | "social"
  | "notifications"
  | "campaigns"
  | "review"
  | "users"
  | "reports"
  | "settings"
  | "logs";

const ICON_MAP: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  tasks: ListChecks,
  submissions: FileText,
  earnings: Wallet,
  profile: UserCog,
  social: Share2,
  notifications: Bell,
  campaigns: Megaphone,
  review: Inbox,
  users: Users,
  reports: BarChart3,
  settings: Settings2,
  logs: ScrollText,
};

export interface NavItem {
  href: string;
  label: string;
  icon?: NavIcon;
  exact?: boolean;
}

interface NavProps {
  items: NavItem[];
  className?: string;
  onNavigate?: () => void;
}

export function Nav({ items, className, onNavigate }: NavProps) {
  const pathname = usePathname();
  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon ? ICON_MAP[item.icon] : null;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
