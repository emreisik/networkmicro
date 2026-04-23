"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Role, UserStatus } from "@prisma/client";
import { ROLE_LABELS } from "@/lib/rbac";
import {
  updateUserAction,
  type UserAdminState,
} from "@/app/(admin)/admin/users/actions";

const initial: UserAdminState = {};

const roles: Role[] = ["USER", "BRAND", "REVIEWER", "ADMIN", "SUPER_ADMIN"];
const statuses: UserStatus[] = [
  "ACTIVE",
  "SUSPENDED",
  "BANNED",
  "PENDING_VERIFICATION",
];

interface Props {
  defaults: {
    id: string;
    name: string;
    role: Role;
    status: UserStatus;
    dailyTaskLimit: number;
    weeklyTaskLimit: number;
  };
  canChangeRole: boolean;
}

export function UserAdminForm({ defaults, canChangeRole }: Props) {
  const [state, action, pending] = useActionState(updateUserAction, initial);

  useEffect(() => {
    if (state.ok) toast.success("User updated.");
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={defaults.id} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required defaultValue={defaults.name} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            name="role"
            defaultValue={defaults.role}
            disabled={!canChangeRole}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={defaults.status}
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
          <Label htmlFor="dailyTaskLimit">Daily task limit</Label>
          <Input
            id="dailyTaskLimit"
            name="dailyTaskLimit"
            type="number"
            min={0}
            max={1000}
            defaultValue={defaults.dailyTaskLimit}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="weeklyTaskLimit">Weekly task limit</Label>
          <Input
            id="weeklyTaskLimit"
            name="weeklyTaskLimit"
            type="number"
            min={0}
            max={10000}
            defaultValue={defaults.weeklyTaskLimit}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="trustScoreAdjustment">Trust score adjustment</Label>
          <Input
            id="trustScoreAdjustment"
            name="trustScoreAdjustment"
            type="number"
            min={-100}
            max={100}
            defaultValue={0}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="adjustmentNote">Adjustment note</Label>
        <Textarea
          id="adjustmentNote"
          name="adjustmentNote"
          rows={2}
          maxLength={500}
        />
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
