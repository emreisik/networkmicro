"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  className?: string;
}

function buildQuery(sp: URLSearchParams, page: number): string {
  const next = new URLSearchParams(sp);
  next.set("page", String(page));
  return next.toString();
}

export function Pagination({ page, totalPages, className }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);

  return (
    <nav
      className={cn("flex items-center justify-between gap-4 pt-4", className)}
    >
      <p className="text-sm text-muted-foreground">
        Page <span className="font-medium text-foreground">{page}</span> of{" "}
        <span className="font-medium text-foreground">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild disabled={page <= 1}>
          <Link
            href={`${pathname}?${buildQuery(searchParams, prev)}`}
            aria-disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          asChild
          disabled={page >= totalPages}
        >
          <Link
            href={`${pathname}?${buildQuery(searchParams, next)}`}
            aria-disabled={page >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </nav>
  );
}
