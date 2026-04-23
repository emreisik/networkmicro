"use client";

import { useActionState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  upsertSettingAction,
  deleteSettingAction,
  type SettingState,
} from "@/app/(admin)/admin/settings/actions";

const initial: SettingState = {};

export function SettingForm() {
  const [state, action, pending] = useActionState(upsertSettingAction, initial);
  useEffect(() => {
    if (state.ok) toast.success("Setting saved.");
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="key">Key</Label>
        <Input
          id="key"
          name="key"
          required
          pattern="^[a-zA-Z0-9_.-]+$"
          placeholder="default.daily.limit"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="value">Value (raw or JSON)</Label>
        <Textarea
          id="value"
          name="value"
          rows={3}
          required
          placeholder='5   or   {"enabled": true}'
        />
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save setting"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteSettingButton({ keyName }: { keyName: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="xs"
      className="text-destructive hover:text-destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete setting "${keyName}"?`)) return;
        start(async () => {
          const res = await deleteSettingAction(keyName);
          if (res.ok) toast.success("Deleted.");
          else if (res.error) toast.error(res.error);
        });
      }}
    >
      Delete
    </Button>
  );
}
