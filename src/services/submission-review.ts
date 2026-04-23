import {
  SubmissionStatus,
  AssignmentStatus,
  AuditAction,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/services/audit";
import { createNotification } from "@/services/notification";
import {
  applyTrustDelta,
  STREAK_BONUS_THRESHOLD,
} from "@/services/trust-score";
import { createEarning } from "@/services/earning";

export class ReviewError extends Error {
  code:
    | "NOT_FOUND"
    | "ALREADY_REVIEWED"
    | "NOT_PENDING"
    | "INVALID_ACTION"
    | "NOT_AUTHORIZED";
  constructor(code: ReviewError["code"], message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export interface ApproveInput {
  submissionId: string;
  reviewerId: string;
  reviewNote?: string;
}

export interface RejectInput {
  submissionId: string;
  reviewerId: string;
  reason: string;
  reviewNote?: string;
  flagged?: boolean;
}

export interface RevisionInput {
  submissionId: string;
  reviewerId: string;
  reviewNote: string;
}

/** Approve a submission — creates earning, updates aggregates, applies trust delta, notifies user. */
export async function approveSubmission(input: ApproveInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const s = await tx.submission.findUnique({
      where: { id: input.submissionId },
      include: {
        task: {
          select: {
            id: true,
            rewardCents: true,
            submissionWindowHours: true,
            approvedCount: true,
          },
        },
        assignment: { select: { deadlineAt: true } },
      },
    });
    if (!s) throw new ReviewError("NOT_FOUND");
    if (s.status !== SubmissionStatus.PENDING)
      throw new ReviewError("NOT_PENDING");

    const now = new Date();

    await tx.submission.update({
      where: { id: s.id },
      data: {
        status: SubmissionStatus.APPROVED,
        reviewerId: input.reviewerId,
        reviewedAt: now,
        reviewNote: input.reviewNote ?? null,
        rejectReason: null,
      },
    });

    await tx.taskAssignment.updateMany({
      where: { submissionId: s.id },
      data: { status: AssignmentStatus.APPROVED, reviewedAt: now },
    });

    await tx.task.update({
      where: { id: s.taskId },
      data: { approvedCount: { increment: 1 } },
    });

    // Earning
    await createEarning(tx, {
      userId: s.userId,
      submissionId: s.id,
      amountCents: s.task.rewardCents,
    });

    // User aggregates: approvedCount, currentStreak, lastActiveAt
    const updatedUser = await tx.user.update({
      where: { id: s.userId },
      data: {
        approvedCount: { increment: 1 },
        currentStreak: { increment: 1 },
        lastActiveAt: now,
      },
      select: { currentStreak: true },
    });

    // Trust deltas (base + on-time + streak bonus)
    await applyTrustDelta(tx, {
      userId: s.userId,
      reason: "SUBMISSION_APPROVED",
      refType: "Submission",
      refId: s.id,
    });

    const deadline = s.assignment?.deadlineAt ?? null;
    if (deadline && s.submittedAt && s.submittedAt <= deadline) {
      await applyTrustDelta(tx, {
        userId: s.userId,
        reason: "SUBMISSION_ON_TIME",
        refType: "Submission",
        refId: s.id,
      });
    }

    if (
      updatedUser.currentStreak > 0 &&
      updatedUser.currentStreak % STREAK_BONUS_THRESHOLD === 0
    ) {
      await applyTrustDelta(tx, {
        userId: s.userId,
        reason: "STREAK_BONUS",
        refType: "Submission",
        refId: s.id,
        note: `Streak ${updatedUser.currentStreak}`,
      });
    }

    await createNotification(
      {
        userId: s.userId,
        type: "SUBMISSION_APPROVED",
        title: "Submission approved",
        body: `Your submission has been approved. Earnings added.`,
        linkUrl: `/dashboard/submissions`,
      },
      tx,
    );

    await writeAudit(
      {
        actorId: input.reviewerId,
        action: AuditAction.SUBMISSION_APPROVED,
        entityType: "Submission",
        entityId: s.id,
        metadata: {
          taskId: s.taskId,
          userId: s.userId,
          rewardCents: s.task.rewardCents,
        },
      },
      tx,
    );
  });
}

/** Reject a submission — resets streak, applies trust penalty. Stronger penalty when flagged as fake. */
export async function rejectSubmission(input: RejectInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const s = await tx.submission.findUnique({
      where: { id: input.submissionId },
      select: { id: true, status: true, userId: true, taskId: true },
    });
    if (!s) throw new ReviewError("NOT_FOUND");
    if (s.status !== SubmissionStatus.PENDING)
      throw new ReviewError("NOT_PENDING");

    const now = new Date();

    await tx.submission.update({
      where: { id: s.id },
      data: {
        status: SubmissionStatus.REJECTED,
        reviewerId: input.reviewerId,
        reviewedAt: now,
        reviewNote: input.reviewNote ?? null,
        rejectReason: input.reason,
        flagged: input.flagged ?? false,
      },
    });

    await tx.taskAssignment.updateMany({
      where: { submissionId: s.id },
      data: { status: AssignmentStatus.REJECTED, reviewedAt: now },
    });

    await tx.user.update({
      where: { id: s.userId },
      data: {
        rejectedCount: { increment: 1 },
        currentStreak: 0,
        lastActiveAt: now,
      },
    });

    await applyTrustDelta(tx, {
      userId: s.userId,
      reason: input.flagged ? "SUBMISSION_FAKE" : "SUBMISSION_REJECTED",
      refType: "Submission",
      refId: s.id,
      note: input.reason.slice(0, 200),
    });

    await createNotification(
      {
        userId: s.userId,
        type: "SUBMISSION_REJECTED",
        title: "Submission rejected",
        body: input.reason,
        linkUrl: `/dashboard/submissions`,
      },
      tx,
    );

    await writeAudit(
      {
        actorId: input.reviewerId,
        action: AuditAction.SUBMISSION_REJECTED,
        entityType: "Submission",
        entityId: s.id,
        metadata: {
          reason: input.reason,
          flagged: input.flagged ?? false,
          userId: s.userId,
        },
      },
      tx,
    );
  });
}

/** Request a revision — user may resubmit. Mild trust penalty. */
export async function requestRevision(input: RevisionInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const s = await tx.submission.findUnique({
      where: { id: input.submissionId },
      select: { id: true, status: true, userId: true, taskId: true },
    });
    if (!s) throw new ReviewError("NOT_FOUND");
    if (s.status !== SubmissionStatus.PENDING)
      throw new ReviewError("NOT_PENDING");

    const now = new Date();

    await tx.submission.update({
      where: { id: s.id },
      data: {
        status: SubmissionStatus.REVISION_REQUESTED,
        reviewerId: input.reviewerId,
        reviewedAt: now,
        reviewNote: input.reviewNote,
      },
    });

    await tx.taskAssignment.updateMany({
      where: { submissionId: s.id },
      data: { status: AssignmentStatus.REVISION_REQUESTED, reviewedAt: now },
    });

    await applyTrustDelta(tx, {
      userId: s.userId,
      reason: "SUBMISSION_REVISION",
      refType: "Submission",
      refId: s.id,
      note: input.reviewNote.slice(0, 200),
    });

    await createNotification(
      {
        userId: s.userId,
        type: "SUBMISSION_REVISION",
        title: "Revision requested",
        body: input.reviewNote,
        linkUrl: `/dashboard/submissions`,
      },
      tx,
    );

    await writeAudit(
      {
        actorId: input.reviewerId,
        action: AuditAction.SUBMISSION_REVISION_REQUESTED,
        entityType: "Submission",
        entityId: s.id,
        metadata: { userId: s.userId },
      },
      tx,
    );
  });
}
