"use server";

import { revalidatePath } from "next/cache";
import { assertRole, AuthError } from "@/lib/auth/require";
import { claimTask, ClaimError } from "@/services/task-assignment";
import { createOrResubmit, SubmissionError } from "@/services/submission";
import {
  buildObjectKey,
  publicUrlFor,
  uploadObject,
  validateImageFile,
  UploadValidationError,
} from "@/lib/storage";
import { submissionCreateSchema } from "@/lib/validators/submission";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function claimAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await assertRole("USER");
    const taskId = String(formData.get("taskId") ?? "");
    if (!taskId) return { ok: false, error: "Missing task id" };

    await claimTask({ userId: user.id, taskId });
    revalidatePath(`/dashboard/tasks/${taskId}`);
    revalidatePath(`/dashboard/tasks`);
    return { ok: true };
  } catch (e) {
    if (e instanceof ClaimError)
      return { ok: false, error: claimErrorMessage(e.code) };
    if (e instanceof AuthError) return { ok: false, error: "Not authorized" };
    console.error(e);
    return { ok: false, error: "Unexpected error" };
  }
}

function claimErrorMessage(code: ClaimError["code"]): string {
  switch (code) {
    case "TASK_NOT_OPEN":
      return "This task is not open for claims.";
    case "TASK_FULL":
      return "This task has reached its assignment limit.";
    case "ALREADY_CLAIMED":
      return "You already have an active assignment for this task.";
    case "DAILY_LIMIT":
      return "You have reached your daily task limit.";
    case "WEEKLY_LIMIT":
      return "You have reached your weekly task limit.";
    case "TRUST_TOO_LOW":
      return "Your trust score is below the task requirement.";
    case "ACCOUNT_NOT_ELIGIBLE":
      return "None of your social accounts meet this task's requirements.";
  }
}

export async function submitProofAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await assertRole("USER");

    const parsed = submissionCreateSchema.safeParse({
      taskId: formData.get("taskId"),
      socialAccountId: formData.get("socialAccountId") || undefined,
      postUrl: formData.get("postUrl") || undefined,
      note: formData.get("note") || undefined,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first?.message ?? "Invalid input" };
    }

    const file = formData.get("screenshot");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Screenshot is required" };
    }

    validateImageFile({ size: file.size, mime: file.type });

    const key = buildObjectKey("submissions", user.id, file.type, file.name);
    const buf = Buffer.from(await file.arrayBuffer());
    await uploadObject({ key, body: buf, contentType: file.type });

    await createOrResubmit({
      userId: user.id,
      taskId: parsed.data.taskId,
      socialAccountId: parsed.data.socialAccountId,
      postUrl: parsed.data.postUrl || undefined,
      note: parsed.data.note || undefined,
      screenshot: {
        url: publicUrlFor(key),
        key,
        mime: file.type,
        size: file.size,
      },
    });

    revalidatePath(`/dashboard/tasks/${parsed.data.taskId}`);
    revalidatePath(`/dashboard/submissions`);
    return { ok: true };
  } catch (e) {
    if (e instanceof UploadValidationError)
      return { ok: false, error: e.message };
    if (e instanceof SubmissionError) {
      switch (e.code) {
        case "MISSING_POST_URL":
          return { ok: false, error: "This task requires a post URL." };
        case "NO_ACTIVE_ASSIGNMENT":
          return { ok: false, error: "Claim the task before submitting." };
        case "ALREADY_REVIEWED":
          return {
            ok: false,
            error: "This submission has already been reviewed.",
          };
        case "TASK_NOT_FOUND":
          return { ok: false, error: "Task no longer exists." };
        case "INVALID_SOCIAL_ACCOUNT":
          return { ok: false, error: "Selected social account is invalid." };
      }
    }
    if (e instanceof AuthError) return { ok: false, error: "Not authorized" };
    console.error(e);
    return { ok: false, error: "Unexpected error" };
  }
}
