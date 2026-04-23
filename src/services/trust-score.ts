import { Prisma, TrustScoreReason } from "@prisma/client";
import { prisma } from "@/lib/db";
import { clamp } from "@/lib/utils";

export const TRUST_MIN = 0;
export const TRUST_MAX = 100;
export const TRUST_DEFAULT = 50;
export const STREAK_BONUS_THRESHOLD = 5;

export const DELTAS: Record<TrustScoreReason, number> = {
  INITIAL: 0,
  SUBMISSION_APPROVED: 2,
  SUBMISSION_ON_TIME: 1,
  SUBMISSION_REVISION: -2,
  SUBMISSION_REJECTED: -5,
  SUBMISSION_FAKE: -15,
  STREAK_BONUS: 5,
  CLAIM_NOT_SUBMITTED: -3,
  MANUAL_ADJUSTMENT: 0,
};

export interface ApplyTrustDeltaInput {
  userId: string;
  reason: TrustScoreReason;
  delta?: number;
  refType?: string;
  refId?: string;
  note?: string;
}

/**
 * Atomically apply a trust-score delta, clamp to [0, 100], and write a log row.
 * Returns the new score. Must be called inside a Prisma transaction to keep
 * the read-modify-write deterministic.
 */
export async function applyTrustDelta(
  tx: Prisma.TransactionClient,
  input: ApplyTrustDeltaInput,
): Promise<{ before: number; after: number; delta: number }> {
  const delta = input.delta ?? DELTAS[input.reason];
  if (delta === 0 && input.reason !== "MANUAL_ADJUSTMENT") {
    // Still log the event with 0 delta for auditability.
  }

  const user = await tx.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { trustScore: true },
  });

  const before = user.trustScore;
  const after = clamp(before + delta, TRUST_MIN, TRUST_MAX);
  const realDelta = after - before;

  await tx.user.update({
    where: { id: input.userId },
    data: { trustScore: after },
  });

  await tx.trustScoreLog.create({
    data: {
      userId: input.userId,
      delta: realDelta,
      before,
      after,
      reason: input.reason,
      refType: input.refType ?? null,
      refId: input.refId ?? null,
      note: input.note ?? null,
    },
  });

  return { before, after, delta: realDelta };
}

export async function getTrustHistory(userId: string, limit = 50) {
  return prisma.trustScoreLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
