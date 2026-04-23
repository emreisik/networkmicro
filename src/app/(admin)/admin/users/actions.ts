"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertRole, AuthError } from "@/lib/auth/require";
import { userAdminUpdateSchema } from "@/lib/validators/user";
import { writeAudit } from "@/services/audit";
import { applyTrustDelta } from "@/services/trust-score";
import { roleAtLeast } from "@/lib/rbac";
import { AuditAction } from "@prisma/client";

export interface UserAdminState {
  ok?: boolean;
  error?: string;
}

export async function updateUserAction(
  _prev: UserAdminState,
  formData: FormData,
): Promise<UserAdminState> {
  try {
    const actor = await assertRole("ADMIN");
    const parsed = userAdminUpdateSchema.safeParse({
      id: formData.get("id"),
      name: formData.get("name") ?? undefined,
      role: formData.get("role") ?? undefined,
      status: formData.get("status") ?? undefined,
      dailyTaskLimit: formData.get("dailyTaskLimit") ?? undefined,
      weeklyTaskLimit: formData.get("weeklyTaskLimit") ?? undefined,
      trustScoreAdjustment: formData.get("trustScoreAdjustment") ?? undefined,
      adjustmentNote: formData.get("adjustmentNote") ?? undefined,
    });
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

    const target = await prisma.user.findUnique({
      where: { id: parsed.data.id },
      select: {
        id: true,
        role: true,
        status: true,
        trustScore: true,
        name: true,
      },
    });
    if (!target) return { error: "User not found" };

    // Only SUPER_ADMIN may touch another SUPER_ADMIN or ADMIN's role
    if (
      parsed.data.role &&
      !roleAtLeast(actor.role, "SUPER_ADMIN") &&
      roleAtLeast(target.role, "ADMIN")
    ) {
      return { error: "Not authorized to change role of this user" };
    }

    await prisma.$transaction(async (tx) => {
      const before = {
        role: target.role,
        status: target.status,
        name: target.name,
      };

      await tx.user.update({
        where: { id: target.id },
        data: {
          ...(parsed.data.name ? { name: parsed.data.name } : {}),
          ...(parsed.data.role ? { role: parsed.data.role } : {}),
          ...(parsed.data.status ? { status: parsed.data.status } : {}),
          ...(parsed.data.dailyTaskLimit !== undefined
            ? { dailyTaskLimit: parsed.data.dailyTaskLimit }
            : {}),
          ...(parsed.data.weeklyTaskLimit !== undefined
            ? { weeklyTaskLimit: parsed.data.weeklyTaskLimit }
            : {}),
        },
      });

      if (parsed.data.role && parsed.data.role !== before.role) {
        await writeAudit(
          {
            actorId: actor.id,
            action: AuditAction.USER_ROLE_CHANGED,
            entityType: "User",
            entityId: target.id,
            metadata: {
              before: before.role,
              after: parsed.data.role,
            },
          },
          tx,
        );
      }
      if (parsed.data.status && parsed.data.status !== before.status) {
        await writeAudit(
          {
            actorId: actor.id,
            action: AuditAction.USER_STATUS_CHANGED,
            entityType: "User",
            entityId: target.id,
            metadata: {
              before: before.status,
              after: parsed.data.status,
            },
          },
          tx,
        );
      } else {
        await writeAudit(
          {
            actorId: actor.id,
            action: AuditAction.USER_UPDATED,
            entityType: "User",
            entityId: target.id,
          },
          tx,
        );
      }

      if (
        parsed.data.trustScoreAdjustment !== undefined &&
        parsed.data.trustScoreAdjustment !== 0
      ) {
        await applyTrustDelta(tx, {
          userId: target.id,
          reason: "MANUAL_ADJUSTMENT",
          delta: parsed.data.trustScoreAdjustment,
          note:
            parsed.data.adjustmentNote || `Manual adjustment by ${actor.email}`,
        });
        await writeAudit(
          {
            actorId: actor.id,
            action: AuditAction.TRUST_SCORE_CHANGED,
            entityType: "User",
            entityId: target.id,
            metadata: { delta: parsed.data.trustScoreAdjustment } as Record<
              string,
              unknown
            >,
          },
          tx,
        );
      }
    });

    revalidatePath(`/admin/users`);
    revalidatePath(`/admin/users/${parsed.data.id}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Not authorized" };
    console.error(e);
    return { error: "Unexpected error" };
  }
}
