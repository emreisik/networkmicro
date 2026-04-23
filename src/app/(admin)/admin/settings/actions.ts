"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertRole, AuthError } from "@/lib/auth/require";
import { writeAudit } from "@/services/audit";
import { AuditAction, Prisma } from "@prisma/client";

export interface SettingState {
  ok?: boolean;
  error?: string;
}

export async function upsertSettingAction(
  _prev: SettingState,
  formData: FormData,
): Promise<SettingState> {
  try {
    const admin = await assertRole("ADMIN");
    const key = String(formData.get("key") ?? "").trim();
    const value = String(formData.get("value") ?? "");
    if (!key) return { error: "Missing key" };

    let parsed: Prisma.InputJsonValue;
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value;
    }

    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: parsed, updatedBy: admin.id },
      create: { key, value: parsed, updatedBy: admin.id },
    });

    await writeAudit({
      actorId: admin.id,
      action: AuditAction.SETTING_UPDATED,
      entityType: "SystemSetting",
      entityId: key,
      metadata: { key },
    });

    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Not authorized" };
    console.error(e);
    return { error: "Unexpected error" };
  }
}

export async function deleteSettingAction(key: string): Promise<SettingState> {
  try {
    const admin = await assertRole("ADMIN");
    await prisma.systemSetting.delete({ where: { key } });
    await writeAudit({
      actorId: admin.id,
      action: AuditAction.SETTING_UPDATED,
      entityType: "SystemSetting",
      entityId: key,
      metadata: { deleted: true },
    });
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Not authorized" };
    console.error(e);
    return { error: "Unexpected error" };
  }
}
