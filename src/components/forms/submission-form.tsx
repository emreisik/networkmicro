"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  submitProofAction,
  type ActionResult,
} from "@/app/(user)/dashboard/tasks/[id]/actions";

const initial: ActionResult = { ok: false };

interface SocialOption {
  id: string;
  label: string;
}

interface Props {
  taskId: string;
  requirePostUrl: boolean;
  socialAccounts: SocialOption[];
  resubmit?: boolean;
}

export function SubmissionForm({
  taskId,
  requirePostUrl,
  socialAccounts,
  resubmit,
}: Props) {
  const [state, action, pending] = useActionState(submitProofAction, initial);

  useEffect(() => {
    if (state.ok)
      toast.success(
        resubmit ? "Proof resubmitted." : "Submission sent for review.",
      );
    else if (state.error) toast.error(state.error);
  }, [state, resubmit]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="taskId" value={taskId} />

      {socialAccounts.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="socialAccountId">Social account used</Label>
          <select
            id="socialAccountId"
            name="socialAccountId"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue=""
          >
            <option value="">—</option>
            {socialAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="screenshot">Screenshot proof</Label>
        <Input
          id="screenshot"
          type="file"
          name="screenshot"
          accept="image/jpeg,image/png,image/webp"
          required
        />
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, or WebP. Max 8 MB.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="postUrl">
          Post URL{requirePostUrl ? " (required)" : ""}
        </Label>
        <Input
          id="postUrl"
          name="postUrl"
          type="url"
          placeholder="https://..."
          required={requirePostUrl}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea
          id="note"
          name="note"
          maxLength={2000}
          rows={3}
          placeholder="Anything the reviewer should know."
        />
      </div>

      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Submitting…" : resubmit ? "Resubmit proof" : "Submit proof"}
      </Button>
    </form>
  );
}
