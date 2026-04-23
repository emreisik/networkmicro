"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createCampaignAction,
  updateCampaignAction,
  type CampaignState,
} from "@/app/(admin)/admin/campaigns/actions";
import { CampaignStatus } from "@prisma/client";

const initial: CampaignState = {};

const statuses: CampaignStatus[] = [
  "DRAFT",
  "SCHEDULED",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
];

interface Props {
  mode: "create" | "edit";
  defaults?: {
    id?: string;
    name?: string;
    slug?: string;
    description?: string | null;
    brand?: string | null;
    status?: CampaignStatus;
    startsAt?: Date | null;
    endsAt?: Date | null;
    budgetCents?: number;
  };
}

function fmt(d?: Date | null): string {
  if (!d) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function CampaignForm({ mode, defaults }: Props) {
  const [state, action, pending] = useActionState(
    mode === "create" ? createCampaignAction : updateCampaignAction,
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
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={defaults?.name ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            name="slug"
            required
            defaultValue={defaults?.slug ?? ""}
            pattern="^[a-z0-9-]+$"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="brand">Brand</Label>
          <Input id="brand" name="brand" defaultValue={defaults?.brand ?? ""} />
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="budgetCents">Budget (cents)</Label>
          <Input
            id="budgetCents"
            name="budgetCents"
            type="number"
            min={0}
            defaultValue={defaults?.budgetCents ?? 0}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          maxLength={4000}
          defaultValue={defaults?.description ?? ""}
        />
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create campaign"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
