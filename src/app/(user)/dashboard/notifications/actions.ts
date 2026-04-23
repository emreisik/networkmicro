"use server";

import { revalidatePath } from "next/cache";
import { assertRole, AuthError } from "@/lib/auth/require";
import { markAllRead, markRead } from "@/services/notification";

export async function markAllReadAction(): Promise<void> {
  try {
    const user = await assertRole("USER");
    await markAllRead(user.id);
    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard");
  } catch (e) {
    if (e instanceof AuthError) return;
    throw e;
  }
}

export async function markOneReadAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await assertRole("USER");
    await markRead(user.id, id);
    revalidatePath("/dashboard/notifications");
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: "Not authorized" };
    return { ok: false, error: "Unexpected error" };
  }
}
