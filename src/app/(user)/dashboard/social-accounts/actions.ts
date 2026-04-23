"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertRole, AuthError } from "@/lib/auth/require";
import {
  socialAccountCreateSchema,
  socialAccountUpdateSchema,
} from "@/lib/validators/social-account";
import { writeAudit } from "@/services/audit";
import { AuditAction } from "@prisma/client";

export interface SocialState {
  ok?: boolean;
  error?: string;
}

export async function createSocialAccountAction(
  _prev: SocialState,
  formData: FormData,
): Promise<SocialState> {
  try {
    const user = await assertRole("USER");
    const parsed = socialAccountCreateSchema.safeParse({
      platform: formData.get("platform"),
      username: formData.get("username"),
      profileUrl: formData.get("profileUrl"),
      followerCount: formData.get("followerCount") ?? 0,
      accountType: formData.get("accountType") ?? "PERSONAL",
      notes: formData.get("notes") ?? undefined,
    });
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

    const created = await prisma.socialAccount.create({
      data: {
        userId: user.id,
        platform: parsed.data.platform,
        username: parsed.data.username,
        profileUrl: parsed.data.profileUrl,
        followerCount: parsed.data.followerCount,
        accountType: parsed.data.accountType,
        notes: parsed.data.notes || null,
      },
      select: { id: true },
    });

    await writeAudit({
      actorId: user.id,
      action: AuditAction.SOCIAL_ACCOUNT_CREATED,
      entityType: "SocialAccount",
      entityId: created.id,
      metadata: {
        platform: parsed.data.platform,
        username: parsed.data.username,
      },
    });

    revalidatePath("/dashboard/social-accounts");
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Not authorized" };
    console.error(e);
    return { error: "Unexpected error. Is this account already added?" };
  }
}

export async function updateSocialAccountAction(
  _prev: SocialState,
  formData: FormData,
): Promise<SocialState> {
  try {
    const user = await assertRole("USER");
    const parsed = socialAccountUpdateSchema.safeParse({
      id: formData.get("id"),
      platform: formData.get("platform") ?? undefined,
      username: formData.get("username") ?? undefined,
      profileUrl: formData.get("profileUrl") ?? undefined,
      followerCount: formData.get("followerCount") ?? undefined,
      accountType: formData.get("accountType") ?? undefined,
      notes: formData.get("notes") ?? undefined,
    });
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

    const existing = await prisma.socialAccount.findFirst({
      where: { id: parsed.data.id, userId: user.id },
      select: { id: true },
    });
    if (!existing) return { error: "Not found" };

    const { id, ...rest } = parsed.data;
    await prisma.socialAccount.update({
      where: { id },
      data: {
        ...rest,
        notes: rest.notes === "" ? null : rest.notes,
      },
    });

    await writeAudit({
      actorId: user.id,
      action: AuditAction.SOCIAL_ACCOUNT_UPDATED,
      entityType: "SocialAccount",
      entityId: id,
    });

    revalidatePath("/dashboard/social-accounts");
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Not authorized" };
    console.error(e);
    return { error: "Unexpected error" };
  }
}

export async function deleteSocialAccountAction(
  id: string,
): Promise<SocialState> {
  try {
    const user = await assertRole("USER");
    const existing = await prisma.socialAccount.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!existing) return { error: "Not found" };

    await prisma.socialAccount.delete({ where: { id } });
    await writeAudit({
      actorId: user.id,
      action: AuditAction.SOCIAL_ACCOUNT_DELETED,
      entityType: "SocialAccount",
      entityId: id,
    });

    revalidatePath("/dashboard/social-accounts");
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Not authorized" };
    console.error(e);
    return { error: "Unexpected error" };
  }
}
