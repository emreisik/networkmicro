"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  reviewSubmissionAction,
  type ReviewState,
} from "@/app/(admin)/admin/submissions/[id]/actions";

const initial: ReviewState = {};

type Mode = "APPROVE" | "REJECT" | "REVISION";

export function ReviewForm({
  submissionId,
  disabled,
}: {
  submissionId: string;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(
    reviewSubmissionAction,
    initial,
  );
  const [mode, setMode] = useState<Mode>("APPROVE");

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  if (disabled) {
    return (
      <p className="text-sm text-muted-foreground">
        This submission is no longer pending and cannot be reviewed.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="action" value={mode} />

      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant={mode === "APPROVE" ? "success" : "outline"}
          onClick={() => setMode("APPROVE")}
        >
          <CheckCircle2 className="mr-1 h-4 w-4" />
          Approve
        </Button>
        <Button
          type="button"
          variant={mode === "REVISION" ? "secondary" : "outline"}
          onClick={() => setMode("REVISION")}
        >
          <RotateCcw className="mr-1 h-4 w-4" />
          Revision
        </Button>
        <Button
          type="button"
          variant={mode === "REJECT" ? "destructive" : "outline"}
          onClick={() => setMode("REJECT")}
        >
          <XCircle className="mr-1 h-4 w-4" />
          Reject
        </Button>
      </div>

      {mode === "REJECT" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rejectReason">Reject reason</Label>
            <Textarea
              id="rejectReason"
              name="rejectReason"
              required
              minLength={3}
              maxLength={500}
              rows={2}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="flagged" />
            Flag as suspicious / fake (applies larger trust penalty)
          </label>
        </>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reviewNote">
          Review note
          {mode === "REVISION"
            ? " (required)"
            : " (optional, shared with user)"}
        </Label>
        <Textarea
          id="reviewNote"
          name="reviewNote"
          required={mode === "REVISION"}
          maxLength={2000}
          rows={3}
        />
      </div>

      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Saving…" : "Submit decision"}
      </Button>
    </form>
  );
}
