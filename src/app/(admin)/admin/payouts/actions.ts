"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertRole, AuthError } from "@/lib/auth/require";
import { payoutBatchCreateSchema } from "@/lib/validators/payout";
import {
  createPayoutBatch,
  markItemPaid,
  markBatchPaid,
  cancelBatch,
  PayoutError,
} from "@/services/payout";

export interface PayoutState {
  ok?: boolean;
  error?: string;
}

export async function createPayoutBatchAction(
  _prev: PayoutState,
  formData: FormData,
): Promise<PayoutState> {
  try {
    const admin = await assertRole("ADMIN");
    const parsed = payoutBatchCreateSchema.safeParse({
      name: formData.get("name"),
      periodStart: formData.get("periodStart"),
      periodEnd: formData.get("periodEnd"),
      notes: formData.get("notes") ?? undefined,
    });
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

    const batch = await createPayoutBatch({
      name: parsed.data.name,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      notes: parsed.data.notes || undefined,
      createdById: admin.id,
    });

    revalidatePath("/admin/payouts");
    redirect(`/admin/payouts/${batch.id}`);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    if (e instanceof PayoutError) {
      if (e.code === "NO_ELIGIBLE_EARNINGS")
        return { error: "No pending earnings found in the selected period." };
      return { error: "Cannot create batch." };
    }
    if (e instanceof AuthError) return { error: "Not authorized" };
    console.error(e);
    return { error: "Unexpected error" };
  }
}

export async function markItemPaidAction(
  formData: FormData,
): Promise<PayoutState> {
  try {
    const admin = await assertRole("ADMIN");
    const id = String(formData.get("id") ?? "");
    const reference = String(formData.get("reference") ?? "");
    const notes = String(formData.get("notes") ?? "");
    if (!id) return { error: "Missing id" };

    await markItemPaid(
      id,
      admin.id,
      reference || undefined,
      notes || undefined,
    );
    revalidatePath("/admin/payouts");
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Not authorized" };
    if (e instanceof PayoutError) return { error: "Cannot update item." };
    console.error(e);
    return { error: "Unexpected error" };
  }
}

export async function markBatchPaidAction(
  batchId: string,
): Promise<PayoutState> {
  try {
    const admin = await assertRole("ADMIN");
    await markBatchPaid(batchId, admin.id);
    revalidatePath("/admin/payouts");
    revalidatePath(`/admin/payouts/${batchId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Not authorized" };
    console.error(e);
    return { error: "Unexpected error" };
  }
}

export async function cancelBatchAction(batchId: string): Promise<PayoutState> {
  try {
    const admin = await assertRole("ADMIN");
    await cancelBatch(batchId, admin.id);
    revalidatePath("/admin/payouts");
    revalidatePath(`/admin/payouts/${batchId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Not authorized" };
    if (e instanceof PayoutError) return { error: "Cannot cancel batch." };
    console.error(e);
    return { error: "Unexpected error" };
  }
}
