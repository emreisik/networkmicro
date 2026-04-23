import {
  SubmissionStatus,
  AssignmentStatus,
  AuditAction,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/services/audit";

export class SubmissionError extends Error {
  code:
    | "TASK_NOT_FOUND"
    | "NO_ACTIVE_ASSIGNMENT"
    | "ALREADY_REVIEWED"
    | "MISSING_POST_URL"
    | "INVALID_SOCIAL_ACCOUNT";
  constructor(code: SubmissionError["code"], message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export interface CreateSubmissionInput {
  userId: string;
  taskId: string;
  socialAccountId?: string;
  postUrl?: string;
  note?: string;
  screenshot: {
    url: string;
    key: string;
    mime: string;
    size: number;
  };
}

/** Create (or replace) a pending submission for an assignment. */
export async function createOrResubmit(
  input: CreateSubmissionInput,
): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: input.taskId },
      select: { id: true, requirePostUrl: true },
    });
    if (!task) throw new SubmissionError("TASK_NOT_FOUND");
    if (task.requirePostUrl && !input.postUrl)
      throw new SubmissionError("MISSING_POST_URL");

    const assignment = await tx.taskAssignment.findUnique({
      where: { taskId_userId: { taskId: input.taskId, userId: input.userId } },
      select: { id: true, status: true, submissionId: true },
    });
    if (!assignment) throw new SubmissionError("NO_ACTIVE_ASSIGNMENT");

    const canSubmit =
      assignment.status === AssignmentStatus.CLAIMED ||
      assignment.status === AssignmentStatus.REVISION_REQUESTED;
    if (!canSubmit) throw new SubmissionError("ALREADY_REVIEWED");

    if (input.socialAccountId) {
      const sa = await tx.socialAccount.findFirst({
        where: { id: input.socialAccountId, userId: input.userId },
        select: { id: true },
      });
      if (!sa) throw new SubmissionError("INVALID_SOCIAL_ACCOUNT");
    }

    const now = new Date();

    const submission = await tx.submission.create({
      data: {
        taskId: input.taskId,
        userId: input.userId,
        socialAccountId: input.socialAccountId ?? null,
        status: SubmissionStatus.PENDING,
        screenshotUrl: input.screenshot.url,
        screenshotKey: input.screenshot.key,
        screenshotMime: input.screenshot.mime,
        screenshotSize: input.screenshot.size,
        postUrl: input.postUrl || null,
        note: input.note || null,
        submittedAt: now,
      },
      select: { id: true },
    });

    await tx.taskAssignment.update({
      where: { id: assignment.id },
      data: {
        status: AssignmentStatus.SUBMITTED,
        submittedAt: now,
        submissionId: submission.id,
      },
    });

    await writeAudit(
      {
        actorId: input.userId,
        action: AuditAction.SUBMISSION_CREATED,
        entityType: "Submission",
        entityId: submission.id,
        metadata: {
          taskId: input.taskId,
          postUrl: input.postUrl ?? null,
        },
      },
      tx,
    );

    return submission.id;
  });
}
