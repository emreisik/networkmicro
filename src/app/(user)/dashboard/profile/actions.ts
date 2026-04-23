"use server";

import { revalidatePath } from "next/cache";
import { assertRole, AuthError } from "@/lib/auth/require";
import {
  profileUpdateSchema,
  passwordChangeSchema,
} from "@/lib/validators/user";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/services/audit";
import { AuditAction } from "@prisma/client";

export interface ProfileState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"name" | "phone" | "country" | "bio", string>>;
}

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  try {
    const user = await assertRole("USER");
    const parsed = profileUpdateSchema.safeParse({
      name: formData.get("name"),
      phone: formData.get("phone"),
      country: formData.get("country"),
      bio: formData.get("bio"),
    });
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      return {
        fieldErrors: {
          name: fe.name?.[0],
          phone: fe.phone?.[0],
          country: fe.country?.[0],
          bio: fe.bio?.[0],
        },
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        country: parsed.data.country || null,
        bio: parsed.data.bio || null,
      },
    });

    await writeAudit({
      actorId: user.id,
      action: AuditAction.USER_UPDATED,
      entityType: "User",
      entityId: user.id,
      metadata: { self: true },
    });

    revalidatePath("/dashboard/profile");
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Not authorized" };
    console.error(e);
    return { error: "Unexpected error" };
  }
}

export interface PasswordState {
  ok?: boolean;
  error?: string;
}

export async function changePasswordAction(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  try {
    const user = await assertRole("USER");
    const parsed = passwordChangeSchema.safeParse({
      current: formData.get("current"),
      next: formData.get("next"),
      confirm: formData.get("confirm"),
    });
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

    const u = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    const ok = await verifyPassword(parsed.data.current, u.passwordHash);
    if (!ok) return { error: "Current password is incorrect" };

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.data.next) },
    });

    await writeAudit({
      actorId: user.id,
      action: AuditAction.USER_UPDATED,
      entityType: "User",
      entityId: user.id,
      metadata: { passwordChanged: true },
    });

    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Not authorized" };
    console.error(e);
    return { error: "Unexpected error" };
  }
}
