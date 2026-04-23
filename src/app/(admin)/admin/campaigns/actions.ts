"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertRole, AuthError } from "@/lib/auth/require";
import {
  campaignCreateSchema,
  campaignUpdateSchema,
  campaignStatusSchema,
} from "@/lib/validators/campaign";
import { writeAudit } from "@/services/audit";
import {
  buildObjectKey,
  deleteObject,
  publicUrlFor,
  uploadObject,
  validateImageFile,
  UploadValidationError,
} from "@/lib/storage";
import { AuditAction } from "@prisma/client";

export interface CampaignState {
  ok?: boolean;
  error?: string;
  id?: string;
}

export async function createCampaignAction(
  _prev: CampaignState,
  formData: FormData,
): Promise<CampaignState> {
  try {
    const admin = await assertRole("ADMIN");

    const parsed = campaignCreateSchema.safeParse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      description: formData.get("description") ?? undefined,
      brand: formData.get("brand") ?? undefined,
      status: formData.get("status") ?? "DRAFT",
      startsAt: formData.get("startsAt") || undefined,
      endsAt: formData.get("endsAt") || undefined,
      budgetCents: formData.get("budgetCents") ?? 0,
    });
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

    const slugTaken = await prisma.campaign.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (slugTaken) return { error: "A campaign with that slug already exists" };

    const campaign = await prisma.campaign.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        brand: parsed.data.brand || null,
        status: parsed.data.status,
        startsAt: parsed.data.startsAt ?? null,
        endsAt: parsed.data.endsAt ?? null,
        budgetCents: parsed.data.budgetCents,
        createdById: admin.id,
      },
      select: { id: true },
    });

    await writeAudit({
      actorId: admin.id,
      action: AuditAction.CAMPAIGN_CREATED,
      entityType: "Campaign",
      entityId: campaign.id,
      metadata: { name: parsed.data.name },
    });

    revalidatePath("/admin/campaigns");
    redirect(`/admin/campaigns/${campaign.id}`);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    if (e instanceof AuthError) return { error: "Not authorized" };
    console.error(e);
    return { error: "Unexpected error" };
  }
}

export async function updateCampaignAction(
  _prev: CampaignState,
  formData: FormData,
): Promise<CampaignState> {
  try {
    const admin = await assertRole("ADMIN");
    const parsed = campaignUpdateSchema.safeParse({
      id: formData.get("id"),
      name: formData.get("name") ?? undefined,
      slug: formData.get("slug") ?? undefined,
      description: formData.get("description") ?? undefined,
      brand: formData.get("brand") ?? undefined,
      status: formData.get("status") ?? undefined,
      startsAt: formData.get("startsAt") || undefined,
      endsAt: formData.get("endsAt") || undefined,
      budgetCents: formData.get("budgetCents") ?? undefined,
    });
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

    const { id, ...rest } = parsed.data;
    await prisma.campaign.update({
      where: { id },
      data: {
        ...rest,
        description: rest.description === "" ? null : rest.description,
        brand: rest.brand === "" ? null : rest.brand,
      },
    });

    await writeAudit({
      actorId: admin.id,
      action: AuditAction.CAMPAIGN_UPDATED,
      entityType: "Campaign",
      entityId: id,
    });

    revalidatePath(`/admin/campaigns/${id}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Not authorized" };
    console.error(e);
    return { error: "Unexpected error" };
  }
}

export async function setCampaignStatusAction(
  formData: FormData,
): Promise<CampaignState> {
  try {
    const admin = await assertRole("ADMIN");
    const parsed = campaignStatusSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
    });
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

    await prisma.campaign.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
    });

    await writeAudit({
      actorId: admin.id,
      action: AuditAction.CAMPAIGN_STATUS_CHANGED,
      entityType: "Campaign",
      entityId: parsed.data.id,
      metadata: { status: parsed.data.status },
    });

    revalidatePath(`/admin/campaigns`);
    revalidatePath(`/admin/campaigns/${parsed.data.id}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Not authorized" };
    console.error(e);
    return { error: "Unexpected error" };
  }
}

export async function uploadCampaignAssetAction(
  formData: FormData,
): Promise<CampaignState> {
  try {
    const admin = await assertRole("ADMIN");
    const campaignId = String(formData.get("campaignId") ?? "");
    if (!campaignId) return { error: "Missing campaign id" };

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0)
      return { error: "No file provided" };

    validateImageFile({ size: file.size, mime: file.type });

    const key = buildObjectKey("campaigns", campaignId, file.type, file.name);
    const buf = Buffer.from(await file.arrayBuffer());
    await uploadObject({ key, body: buf, contentType: file.type });

    const title = String(formData.get("title") ?? "") || null;
    const caption = String(formData.get("caption") ?? "") || null;
    const hashtags = String(formData.get("hashtags") ?? "") || null;
    const linkUrl = String(formData.get("linkUrl") ?? "") || null;
    const instructions = String(formData.get("instructions") ?? "") || null;

    await prisma.campaignAsset.create({
      data: {
        campaignId,
        fileUrl: publicUrlFor(key),
        fileKey: key,
        mimeType: file.type,
        sizeBytes: file.size,
        title,
        caption,
        hashtags,
        linkUrl,
        instructions,
      },
    });

    await writeAudit({
      actorId: admin.id,
      action: AuditAction.CAMPAIGN_UPDATED,
      entityType: "Campaign",
      entityId: campaignId,
      metadata: { assetAdded: true },
    });

    revalidatePath(`/admin/campaigns/${campaignId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof UploadValidationError) return { error: e.message };
    if (e instanceof AuthError) return { error: "Not authorized" };
    console.error(e);
    return { error: "Unexpected error" };
  }
}

export async function deleteCampaignAssetAction(
  assetId: string,
): Promise<CampaignState> {
  try {
    const admin = await assertRole("ADMIN");
    const a = await prisma.campaignAsset.findUnique({
      where: { id: assetId },
      select: { id: true, campaignId: true, fileKey: true },
    });
    if (!a) return { error: "Not found" };

    await prisma.campaignAsset.delete({ where: { id: a.id } });
    try {
      await deleteObject(a.fileKey);
    } catch (err) {
      console.error("Failed to delete object", err);
    }

    await writeAudit({
      actorId: admin.id,
      action: AuditAction.CAMPAIGN_UPDATED,
      entityType: "Campaign",
      entityId: a.campaignId,
      metadata: { assetDeleted: true },
    });

    revalidatePath(`/admin/campaigns/${a.campaignId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Not authorized" };
    console.error(e);
    return { error: "Unexpected error" };
  }
}
