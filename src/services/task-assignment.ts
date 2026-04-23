import { AssignmentStatus, AuditAction } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/services/audit";
import { createNotification } from "@/services/notification";

export class ClaimError extends Error {
  code:
    | "TASK_NOT_OPEN"
    | "TASK_FULL"
    | "ALREADY_CLAIMED"
    | "DAILY_LIMIT"
    | "WEEKLY_LIMIT"
    | "TRUST_TOO_LOW"
    | "ACCOUNT_NOT_ELIGIBLE";
  constructor(code: ClaimError["code"], message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export interface ClaimInput {
  userId: string;
  taskId: string;
}

/**
 * Claim a task for the user.
 * - enforces task window / status / caps
 * - enforces user daily + weekly limits
 * - creates an assignment with a calculated deadline
 * - audits the action
 */
export async function claimTask(
  input: ClaimInput,
): Promise<{ assignmentId: string; deadlineAt: Date }> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: input.userId },
      select: {
        id: true,
        status: true,
        trustScore: true,
        dailyTaskLimit: true,
        weeklyTaskLimit: true,
      },
    });

    if (user.status !== "ACTIVE")
      throw new ClaimError("TASK_NOT_OPEN", "Account not active");

    const task = await tx.task.findUniqueOrThrow({
      where: { id: input.taskId },
      select: {
        id: true,
        status: true,
        platform: true,
        rewardCents: true,
        maxAssignments: true,
        assignedCount: true,
        submissionWindowHours: true,
        minFollowers: true,
        minTrustScore: true,
        allowedAccountTypes: true,
        startsAt: true,
        endsAt: true,
      },
    });

    const now = new Date();
    if (task.status !== "OPEN") throw new ClaimError("TASK_NOT_OPEN");
    if (task.startsAt && task.startsAt > now)
      throw new ClaimError("TASK_NOT_OPEN", "Task has not started");
    if (task.endsAt && task.endsAt < now)
      throw new ClaimError("TASK_NOT_OPEN", "Task has ended");
    if (task.maxAssignments > 0 && task.assignedCount >= task.maxAssignments) {
      throw new ClaimError("TASK_FULL");
    }
    if (user.trustScore < task.minTrustScore)
      throw new ClaimError("TRUST_TOO_LOW");

    const existing = await tx.taskAssignment.findUnique({
      where: { taskId_userId: { taskId: task.id, userId: user.id } },
      select: { id: true, status: true },
    });
    if (
      existing &&
      existing.status !== "CANCELLED" &&
      existing.status !== "EXPIRED"
    ) {
      throw new ClaimError("ALREADY_CLAIMED");
    }

    // Daily + weekly limits
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [todayCount, weekCount] = await Promise.all([
      tx.taskAssignment.count({
        where: { userId: user.id, claimedAt: { gte: startOfDay } },
      }),
      tx.taskAssignment.count({
        where: { userId: user.id, claimedAt: { gte: sevenDaysAgo } },
      }),
    ]);

    if (user.dailyTaskLimit > 0 && todayCount >= user.dailyTaskLimit) {
      throw new ClaimError("DAILY_LIMIT");
    }
    if (user.weeklyTaskLimit > 0 && weekCount >= user.weeklyTaskLimit) {
      throw new ClaimError("WEEKLY_LIMIT");
    }

    const deadlineAt = new Date(
      now.getTime() + task.submissionWindowHours * 60 * 60 * 1000,
    );

    const assignment = existing
      ? await tx.taskAssignment.update({
          where: { id: existing.id },
          data: {
            status: AssignmentStatus.CLAIMED,
            claimedAt: now,
            deadlineAt,
            submittedAt: null,
            reviewedAt: null,
            cancelledAt: null,
            submissionId: null,
          },
          select: { id: true, deadlineAt: true },
        })
      : await tx.taskAssignment.create({
          data: {
            taskId: task.id,
            userId: user.id,
            status: AssignmentStatus.CLAIMED,
            claimedAt: now,
            deadlineAt,
          },
          select: { id: true, deadlineAt: true },
        });

    const newAssignedCount = task.assignedCount + (existing ? 0 : 1);
    await tx.task.update({
      where: { id: task.id },
      data: {
        assignedCount: newAssignedCount,
        status:
          task.maxAssignments > 0 && newAssignedCount >= task.maxAssignments
            ? "FULL"
            : task.status,
      },
    });

    await writeAudit(
      {
        actorId: user.id,
        action: AuditAction.TASK_CLAIMED,
        entityType: "TaskAssignment",
        entityId: assignment.id,
        metadata: {
          taskId: task.id,
          deadlineAt: assignment.deadlineAt.toISOString(),
        },
      },
      tx,
    );

    await createNotification(
      {
        userId: user.id,
        type: "TASK_CLAIMED",
        title: "Task claimed",
        body: "You have a new task. Complete and submit proof before the deadline.",
        linkUrl: `/dashboard/tasks/${task.id}`,
      },
      tx,
    );

    return { assignmentId: assignment.id, deadlineAt: assignment.deadlineAt };
  });
}

/** Marks stale CLAIMED assignments as EXPIRED and applies a trust penalty. Runs inside a transaction. */
export async function expireOverdueAssignments(): Promise<number> {
  const now = new Date();
  const overdue = await prisma.taskAssignment.findMany({
    where: { status: "CLAIMED", deadlineAt: { lt: now } },
    select: { id: true, userId: true, taskId: true },
    take: 500,
  });
  if (overdue.length === 0) return 0;

  const { applyTrustDelta } = await import("@/services/trust-score");

  let count = 0;
  for (const a of overdue) {
    await prisma.$transaction(async (tx) => {
      await tx.taskAssignment.update({
        where: { id: a.id },
        data: { status: "EXPIRED" },
      });
      await applyTrustDelta(tx, {
        userId: a.userId,
        reason: "CLAIM_NOT_SUBMITTED",
        refType: "TaskAssignment",
        refId: a.id,
      });
      await writeAudit(
        {
          actorId: null,
          action: AuditAction.TRUST_SCORE_CHANGED,
          entityType: "TaskAssignment",
          entityId: a.id,
          metadata: { reason: "CLAIM_NOT_SUBMITTED" },
        },
        tx,
      );
    });
    count++;
  }
  return count;
}
