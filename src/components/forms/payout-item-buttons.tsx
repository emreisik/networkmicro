"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  markItemPaidAction,
  markBatchPaidAction,
  cancelBatchAction,
} from "@/app/(admin)/admin/payouts/actions";

export function MarkItemPaidForm({ itemId }: { itemId: string }) {
  const [pending, start] = useTransition();
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", itemId);
    const form = e.currentTarget;
    start(async () => {
      const res = await markItemPaidAction(fd);
      if (res.ok) {
        toast.success("Marked paid.");
        form.reset();
      } else if (res.error) {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <Input
        name="reference"
        placeholder="Reference"
        className="h-8 w-32 text-xs"
      />
      <Button type="submit" size="xs" variant="success" disabled={pending}>
        Pay
      </Button>
    </form>
  );
}

export function MarkBatchPaidButton({ batchId }: { batchId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="success"
      size="sm"
      disabled={pending}
      onClick={() => {
        start(async () => {
          const res = await markBatchPaidAction(batchId);
          if (res.ok) toast.success("All items paid.");
          else if (res.error) toast.error(res.error);
        });
      }}
    >
      {pending ? "Paying…" : "Mark all paid"}
    </Button>
  );
}

export function CancelBatchButton({ batchId }: { batchId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "Cancel this batch? Earnings will be unlocked back to PENDING.",
          )
        )
          return;
        start(async () => {
          const res = await cancelBatchAction(batchId);
          if (res.ok) toast.success("Batch cancelled.");
          else if (res.error) toast.error(res.error);
        });
      }}
    >
      {pending ? "Cancelling…" : "Cancel batch"}
    </Button>
  );
}
