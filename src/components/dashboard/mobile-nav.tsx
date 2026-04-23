"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Nav, type NavItem } from "@/components/dashboard/nav";

interface Props {
  items: NavItem[];
  brandHref: string;
  brandLabel: string;
}

export function MobileNav({ items, brandHref, brandLabel }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close when the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-background text-foreground transition-colors hover:bg-muted md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>

        <div className="flex h-14 shrink-0 items-center border-b px-4">
          <Link
            href={brandHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            <span className="truncate">{brandLabel}</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <Nav items={items} onNavigate={() => setOpen(false)} />
        </div>

        <div className="shrink-0 border-t px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          Network Mikro
        </div>
      </SheetContent>
    </Sheet>
  );
}
