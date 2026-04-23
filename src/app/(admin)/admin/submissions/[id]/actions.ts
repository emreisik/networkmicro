"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertRole, AuthError } from "@/lib/auth/require";
import { submissionReviewSchema } from "@/lib/validators/submission";
import {
  approveSubmission,
  rejectSubmission,
  requestRevision,
  ReviewError,
} from "@/services/submission-review";

export interface ReviewState {
  ok?: boolean;
  error?: string;
}

export async function reviewSubmissionAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  try {
    const reviewer = await assertRole("REVIEWER");
    const parsed = submissionReviewSchema.safeParse({
      submissionId: formData.get("submissionId"),
      action: formData.get("action"),
      reviewNote: formData.get("reviewNote") ?? undefined,
      rejectReason: formData.get("rejectReason") ?? undefined,
      flagged: formData.get("flagged") === "on",
    });
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

    switch (parsed.data.action) {
      case "APPROVE":
        await approveSubmission({
          submissionId: parsed.data.submissionId,
          reviewerId: reviewer.id,
          reviewNote: parsed.data.reviewNote || undefined,
        });
        break;
      case "REJECT":
        if (!parsed.data.rejectReason)
          return { error: "A reject reason is required." };
        await rejectSubmission({
          submissionId: parsed.data.submissionId,
          reviewerId: reviewer.id,
          reason: parsed.data.rejectReason,
          reviewNote: parsed.data.reviewNote || undefined,
          flagged: parsed.data.flagged,
        });
        break;
      case "REVISION":
        if (!parsed.data.reviewNote)
          return { error: "A revision note is required." };
        await requestRevision({
          submissionId: parsed.data.submissionId,
          reviewerId: reviewer.id,
          reviewNote: parsed.data.reviewNote,
        });
        break;
    }

    revalidatePath(`/admin/submissions`);
    revalidatePath(`/admin/submissions/${parsed.data.submissionId}`);
    revalidatePath(`/admin`);
    redirect("/admin/submissions");
  } catch (e) {
    if (e instanceof ReviewError) {
      switch (e.code) {
        case "NOT_FOUND":
          return { error: "Submission not found." };
        case "NOT_PENDING":
          return { error: "This submission is no longer pending." };
        default:
          return { error: "Cannot complete review." };
      }
    }
    if (e instanceof AuthError) return { error: "Not authorized" };
    // redirect throws a NEXT_REDIRECT error — propagate it
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    return { error: "Unexpected error" };
  }
}
