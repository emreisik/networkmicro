"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createTaskAction,
  updateTaskAction,
  type TaskState,
} from "@/app/(admin)/admin/tasks/actions";
import {
  Platform,
  SocialAccountType,
  TaskActionType,
  TaskStatus,
} from "@prisma/client";

const initial: TaskState = {};

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
const actions: TaskActionType[] = [
  "POST",
  "STORY",
  "REEL",
  "COMMENT",
  "LIKE",
  "SHARE",
  "FOLLOW",
  "REVIEW",
  "OTHER",
];
const statuses: TaskStatus[] = [
  "DRAFT",
  "OPEN",
  "PAUSED",
  "FULL",
  "EXPIRED",
  "ARCHIVED",
];
const types: SocialAccountType[] = ["PERSONAL", "BUSINESS", "CREATOR"];

function fmt(d?: Date | null): string {
  if (!d) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

interface Campaign {
  id: string;
  name: string;
}

interface Props {
  mode: "create" | "edit";
  campaigns: Campaign[];
  defaults?: {
    id?: string;
    campaignId?: string;
    title?: string;
    description?: string | null;
    platform?: Platform;
    action?: TaskActionType;
    status?: TaskStatus;
    rewardCents?: number;
    requireScreenshot?: boolean;
    requirePostUrl?: boolean;
    requireCaption?: boolean;
    minFollowers?: number;
    minTrustScore?: number;
    allowedAccountTypes?: SocialAccountType[];
    maxAssignments?: number;
    submissionWindowHours?: number;
    startsAt?: Date | null;
    endsAt?: Date | null;
    instructions?: string | null;
    caption?: string | null;
    hashtags?: string | null;
    linkUrl?: string | null;
  };
}

export function TaskForm({ mode, campaigns, defaults }: Props) {
  const [state, action, pending] = useActionState(
    mode === "create" ? createTaskAction : updateTaskAction,
    initial,
  );

  useEffect(() => {
    if (state.ok) toast.success("Saved.");
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-4">
      {mode === "edit" && defaults?.id ? (
        <input type="hidden" name="id" value={defaults.id} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="campaignId">Campaign</Label>
          <select
            id="campaignId"
            name="campaignId"
            required
            defaultValue={defaults?.campaignId ?? ""}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>
              Select…
            </option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            required
            defaultValue={defaults?.title ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="platform">Platform</Label>
          <select
            id="platform"
            name="platform"
            required
            defaultValue={defaults?.platform ?? ""}
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
          <Label htmlFor="action">Action</Label>
          <select
            id="action"
            name="action"
            defaultValue={defaults?.action ?? "POST"}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={defaults?.status ?? "DRAFT"}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rewardCents">Reward (cents)</Label>
          <Input
            id="rewardCents"
            name="rewardCents"
            type="number"
            min={0}
            required
            defaultValue={defaults?.rewardCents ?? 0}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maxAssignments">
            Max assignments (0 = unlimited)
          </Label>
          <Input
            id="maxAssignments"
            name="maxAssignments"
            type="number"
            min={0}
            defaultValue={defaults?.maxAssignments ?? 0}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="submissionWindowHours">
            Submission window (hours)
          </Label>
          <Input
            id="submissionWindowHours"
            name="submissionWindowHours"
            type="number"
            min={1}
            max={24 * 30}
            defaultValue={defaults?.submissionWindowHours ?? 24}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="minFollowers">Min followers</Label>
          <Input
            id="minFollowers"
            name="minFollowers"
            type="number"
            min={0}
            defaultValue={defaults?.minFollowers ?? 0}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="minTrustScore">Min trust score</Label>
          <Input
            id="minTrustScore"
            name="minTrustScore"
            type="number"
            min={0}
            max={100}
            defaultValue={defaults?.minTrustScore ?? 0}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startsAt">Starts at</Label>
          <Input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={fmt(defaults?.startsAt)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endsAt">Ends at</Label>
          <Input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            defaultValue={fmt(defaults?.endsAt)}
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2 rounded-md border p-3">
        <legend className="px-1 text-xs text-muted-foreground">
          Requirements
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="requireScreenshot"
            defaultChecked={defaults?.requireScreenshot ?? true}
          />
          Require screenshot
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="requirePostUrl"
            defaultChecked={defaults?.requirePostUrl ?? false}
          />
          Require post URL
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="requireCaption"
            defaultChecked={defaults?.requireCaption ?? false}
          />
          Require caption text match
        </label>
        <div className="mt-2">
          <p className="text-xs text-muted-foreground">Allowed account types</p>
          <div className="mt-1 flex flex-wrap gap-3 text-sm">
            {types.map((t) => (
              <label key={t} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  name="allowedAccountTypes"
                  value={t}
                  defaultChecked={defaults?.allowedAccountTypes?.includes(t)}
                />
                {t}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaults?.description ?? ""}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea
          id="instructions"
          name="instructions"
          rows={3}
          defaultValue={defaults?.instructions ?? ""}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="caption">Caption to use</Label>
          <Textarea
            id="caption"
            name="caption"
            rows={2}
            defaultValue={defaults?.caption ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hashtags">Hashtags</Label>
          <Input
            id="hashtags"
            name="hashtags"
            defaultValue={defaults?.hashtags ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <Label htmlFor="linkUrl">Link URL</Label>
          <Input
            id="linkUrl"
            name="linkUrl"
            type="url"
            defaultValue={defaults?.linkUrl ?? ""}
          />
        </div>
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create task"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
