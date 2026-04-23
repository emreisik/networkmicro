"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertRole, AuthError } from "@/lib/auth/require";
import {
  taskCreateSchema,
  taskUpdateSchema,
  taskStatusSchema,
} from "@/lib/validators/task";
import { writeAudit } from "@/services/audit";
import { AuditAction, SocialAccountType } from "@prisma/client";

export interface TaskState {
  ok?: boolean;
  error?: string;
  id?: string;
}

function parseAllowedTypes(formData: FormData): SocialAccountType[] {
  const all = formData.getAll("allowedAccountTypes");
  return all
    .filter((v): v is string => typeof v === "string")
    .filter((v): v is SocialAccountType =>
      ["PERSONAL", "BUSINESS", "CREATOR"].includes(v),
    );
}

export async function createTaskAction(
  _prev: TaskState,
  formData: FormData,
): Promise<TaskState> {
  try {
    const admin = await assertRole("ADMIN");
    const parsed = taskCreateSchema.safeParse({
      campaignId: formData.get("campaignId"),
      title: formData.get("title"),
      description: formData.get("description") ?? undefined,
      platform: formData.get("platform"),
      action: formData.get("action") ?? "POST",
      status: formData.get("status") ?? "DRAFT",
      rewardCents: formData.get("rewardCents") ?? 0,
      requireScreenshot: formData.get("requireScreenshot") === "on",
      requirePostUrl: formData.get("requirePostUrl") === "on",
      requireCaption: formData.get("requireCaption") === "on",
      minFollowers: formData.get("minFollowers") ?? 0,
      minTrustScore: formData.get("minTrustScore") ?? 0,
      allowedAccountTypes: parseAllowedTypes(formData),
      maxAssignments: formData.get("maxAssignments") ?? 0,
      submissionWindowHours: formData.get("submissionWindowHours") ?? 24,
      startsAt: formData.get("startsAt") || undefined,
      endsAt: formData.get("endsAt") || undefined,
      instructions: formData.get("instructions") ?? undefined,
      caption: formData.get("caption") ?? undefined,
      hashtags: formData.get("hashtags") ?? undefined,
      linkUrl: formData.get("linkUrl") ?? undefined,
    });
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

    const task = await prisma.task.create({
      data: {
        campaignId: parsed.data.campaignId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        platform: parsed.data.platform,
        action: parsed.data.action,
        status: parsed.data.status,
        rewardCents: parsed.data.rewardCents,
        requireScreenshot: parsed.data.requireScreenshot,
        requirePostUrl: parsed.data.requirePostUrl,
        requireCaption: parsed.data.requireCaption,
        minFollowers: parsed.data.minFollowers,
        minTrustScore: parsed.data.minTrustScore,
        allowedAccountTypes: parsed.data.allowedAccountTypes,
        maxAssignments: parsed.data.maxAssignments,
        submissionWindowHours: parsed.data.submissionWindowHours,
        startsAt: parsed.data.startsAt ?? null,
        endsAt: parsed.data.endsAt ?? null,
        instructions: parsed.data.instructions || null,
        caption: parsed.data.caption || null,
        hashtags: parsed.data.hashtags || null,
        linkUrl: parsed.data.linkUrl || null,
      },
      select: { id: true, campaignId: true },
    });

    await writeAudit({
      actorId: admin.id,
      action: AuditAction.TASK_CREATED,
      entityType: "Task",
      entityId: task.id,
      metadata: { campaignId: task.campaignId },
    });

    revalidatePath(`/admin/tasks`);
    revalidatePath(`/admin/campaigns/${task.campaignId}`);
    redirect(`/admin/tasks/${task.id}`);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    if (e instanceof AuthError) return { error: "Not authorized" };
    console.error(e);
    return { error: "Unexpected error" };
  }
}

export async function updateTaskAction(
  _prev: TaskState,
  formData: FormData,
): Promise<TaskState> {
  try {
    const admin = await assertRole("ADMIN");
    const parsed = taskUpdateSchema.safeParse({
      id: formData.get("id"),
      campaignId: formData.get("campaignId") ?? undefined,
      title: formData.get("title") ?? undefined,
      description: formData.get("description") ?? undefined,
      platform: formData.get("platform") ?? undefined,
      action: formData.get("action") ?? undefined,
      status: formData.get("status") ?? undefined,
      rewardCents: formData.get("rewardCents") ?? undefined,
      requireScreenshot: formData.get("requireScreenshot") === "on",
      requirePostUrl: formData.get("requirePostUrl") === "on",
      requireCaption: formData.get("requireCaption") === "on",
      minFollowers: formData.get("minFollowers") ?? undefined,
      minTrustScore: formData.get("minTrustScore") ?? undefined,
      allowedAccountTypes: parseAllowedTypes(formData),
      maxAssignments: formData.get("maxAssignments") ?? undefined,
      submissionWindowHours: formData.get("submissionWindowHours") ?? undefined,
      startsAt: formData.get("startsAt") || undefined,
      endsAt: formData.get("endsAt") || undefined,
      instructions: formData.get("instructions") ?? undefined,
      caption: formData.get("caption") ?? undefined,
      hashtags: formData.get("hashtags") ?? undefined,
      linkUrl: formData.get("linkUrl") ?? undefined,
    });
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

    const { id, ...rest } = parsed.data;

    await prisma.task.update({
      where: { id },
      data: {
        ...rest,
        description: rest.description === "" ? null : rest.description,
        instructions: rest.instructions === "" ? null : rest.instructions,
        caption: rest.caption === "" ? null : rest.caption,
        hashtags: rest.hashtags === "" ? null : rest.hashtags,
        linkUrl: rest.linkUrl === "" ? null : rest.linkUrl,
      },
    });

    await writeAudit({
      actorId: admin.id,
      action: AuditAction.TASK_UPDATED,
      entityType: "Task",
      entityId: id,
    });

    revalidatePath(`/admin/tasks/${id}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Not authorized" };
    console.error(e);
    return { error: "Unexpected error" };
  }
}

export async function setTaskStatusAction(
  formData: FormData,
): Promise<TaskState> {
  try {
    const admin = await assertRole("ADMIN");
    const parsed = taskStatusSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
    });
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

    await prisma.task.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
    });

    await writeAudit({
      actorId: admin.id,
      action: AuditAction.TASK_STATUS_CHANGED,
      entityType: "Task",
      entityId: parsed.data.id,
      metadata: { status: parsed.data.status },
    });

    revalidatePath(`/admin/tasks`);
    revalidatePath(`/admin/tasks/${parsed.data.id}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Not authorized" };
    console.error(e);
    return { error: "Unexpected error" };
  }
}
