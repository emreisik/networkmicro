"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createSocialAccountAction,
  deleteSocialAccountAction,
  type SocialState,
} from "@/app/(user)/dashboard/social-accounts/actions";
import type { Platform, SocialAccountType } from "@prisma/client";

const platforms: Platform[] = [
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "X",
  "FACEBOOK",
  "LINKEDIN",
  "THREADS",
  "OTHER",
];
const types: SocialAccountType[] = ["PERSONAL", "BUSINESS", "CREATOR"];

const initial: SocialState = {};

export function SocialAccountForm({ onDone }: { onDone?: () => void }) {
  const [state, action, pending] = useActionState(
    createSocialAccountAction,
    initial,
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("Social account added.");
      onDone?.();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="platform">Platform</Label>
          <select
            id="platform"
            name="platform"
            defaultValue=""
            required
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>
              Select…
            </option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="accountType">Account type</Label>
          <select
            id="accountType"
            name="accountType"
            defaultValue="PERSONAL"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            required
            maxLength={80}
            placeholder="handle"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="followerCount">Follower count</Label>
          <Input
            id="followerCount"
            name="followerCount"
            type="number"
            min={0}
            defaultValue={0}
          />
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <Label htmlFor="profileUrl">Profile URL</Label>
          <Input
            id="profileUrl"
            name="profileUrl"
            type="url"
            required
            placeholder="https://..."
          />
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea id="notes" name="notes" rows={2} maxLength={500} />
        </div>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add account"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteSocialAccountButton({ id }: { id: string }) {
  return (
    <form
      action={async () => {
        const res = await deleteSocialAccountAction(id);
        if (res.ok) toast.success("Removed.");
        else if (res.error) toast.error(res.error);
      }}
    >
      <Button
        type="submit"
        variant="ghost"
        size="xs"
        className="text-destructive hover:text-destructive"
      >
        Remove
      </Button>
    </form>
  );
}
