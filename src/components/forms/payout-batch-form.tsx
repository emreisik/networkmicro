"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createPayoutBatchAction,
  type PayoutState,
} from "@/app/(admin)/admin/payouts/actions";

const initial: PayoutState = {};

function defaultWeekRange() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 0, 0);
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);

  const fmt = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);

  return {
    start: fmt(start),
    end: fmt(end),
    name: `Weekly payout ${end.toISOString().slice(0, 10)}`,
  };
}

export function PayoutBatchForm() {
  const [state, action, pending] = useActionState(
    createPayoutBatchAction,
    initial,
  );
  const defaults = defaultWeekRange();

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-1.5 md:col-span-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={defaults.name} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="periodStart">Period start</Label>
        <Input
          id="periodStart"
          name="periodStart"
          type="datetime-local"
          required
          defaultValue={defaults.start}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="periodEnd">Period end</Label>
        <Input
          id="periodEnd"
          name="periodEnd"
          type="datetime-local"
          required
          defaultValue={defaults.end}
        />
      </div>
      <div className="flex flex-col gap-1.5 md:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} maxLength={2000} />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create batch"}
        </Button>
      </div>
    </form>
  );
}
