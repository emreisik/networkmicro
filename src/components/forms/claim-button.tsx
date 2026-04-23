"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  claimAction,
  type ActionResult,
} from "@/app/(user)/dashboard/tasks/[id]/actions";

const initial: ActionResult = { ok: false };

export function ClaimButton({
  taskId,
  disabled,
}: {
  taskId: string;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(claimAction, initial);

  useEffect(() => {
    if (state.ok)
      toast.success(
        "Task claimed. You have the submission window to complete it.",
      );
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action}>
      <input type="hidden" name="taskId" value={taskId} />
      <Button type="submit" disabled={disabled || pending} size="lg">
        {pending ? "Claiming…" : "Claim task"}
      </Button>
    </form>
  );
}
