import {
  PayoutBatchStatus,
  PayoutItemStatus,
  EarningStatus,
  AuditAction,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/services/audit";
import { createNotification } from "@/services/notification";

export class PayoutError extends Error {
  code:
    | "NO_ELIGIBLE_EARNINGS"
    | "BATCH_NOT_FOUND"
    | "BATCH_NOT_EDITABLE"
    | "ITEM_NOT_FOUND"
    | "INVALID_STATE";
  constructor(code: PayoutError["code"], message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export interface CreateBatchInput {
  name: string;
  periodStart: Date;
  periodEnd: Date;
  createdById: string;
  notes?: string;
}

/**
 * Create a payout batch for the given period.
 * - pulls all PENDING earnings approved in range
 * - groups by userId into PayoutItems
 * - locks earnings into the batch
 */
export async function createPayoutBatch(
  input: CreateBatchInput,
): Promise<{ id: string; itemCount: number; totalCents: number }> {
  return prisma.$transaction(async (tx) => {
    const eligible = await tx.earning.findMany({
      where: {
        status: EarningStatus.PENDING,
        createdAt: { gte: input.periodStart, lte: input.periodEnd },
      },
      select: { id: true, userId: true, amountCents: true },
    });

    if (eligible.length === 0) throw new PayoutError("NO_ELIGIBLE_EARNINGS");

    const batch = await tx.payoutBatch.create({
      data: {
        name: input.name,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        status: PayoutBatchStatus.OPEN,
        createdById: input.createdById,
        notes: input.notes ?? null,
      },
      select: { id: true },
    });

    // Group by user
    const byUser = new Map<string, { total: number; earningIds: string[] }>();
    for (const e of eligible) {
      const bucket = byUser.get(e.userId) ?? { total: 0, earningIds: [] };
      bucket.total += e.amountCents;
      bucket.earningIds.push(e.id);
      byUser.set(e.userId, bucket);
    }

    let totalCents = 0;
    let itemCount = 0;

    for (const [userId, bucket] of byUser.entries()) {
      const item = await tx.payoutItem.create({
        data: {
          batchId: batch.id,
          userId,
          amountCents: bucket.total,
          status: PayoutItemStatus.PENDING,
        },
        select: { id: true },
      });

      await tx.earning.updateMany({
        where: { id: { in: bucket.earningIds } },
        data: { status: EarningStatus.LOCKED, payoutItemId: item.id },
      });

      totalCents += bucket.total;
      itemCount += 1;
    }

    await tx.payoutBatch.update({
      where: { id: batch.id },
      data: { totalCents, itemCount },
    });

    await writeAudit(
      {
        actorId: input.createdById,
        action: AuditAction.PAYOUT_BATCH_CREATED,
        entityType: "PayoutBatch",
        entityId: batch.id,
        metadata: {
          itemCount,
          totalCents,
          periodStart: input.periodStart.toISOString(),
          periodEnd: input.periodEnd.toISOString(),
        },
      },
      tx,
    );

    return { id: batch.id, itemCount, totalCents };
  });
}

/** Mark a single payout item as PAID. Flips its earnings to PAID and updates user counters. */
export async function markItemPaid(
  itemId: string,
  actorId: string,
  reference?: string,
  notes?: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const item = await tx.payoutItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        userId: true,
        amountCents: true,
        status: true,
        batchId: true,
      },
    });
    if (!item) throw new PayoutError("ITEM_NOT_FOUND");
    if (item.status !== PayoutItemStatus.PENDING)
      throw new PayoutError("INVALID_STATE");

    const now = new Date();

    await tx.payoutItem.update({
      where: { id: item.id },
      data: {
        status: PayoutItemStatus.PAID,
        paidAt: now,
        reference: reference ?? null,
        notes: notes ?? null,
      },
    });

    await tx.earning.updateMany({
      where: { payoutItemId: item.id, status: EarningStatus.LOCKED },
      data: { status: EarningStatus.PAID },
    });

    await tx.user.update({
      where: { id: item.userId },
      data: {
        totalPaid: { increment: item.amountCents },
        balance: { decrement: item.amountCents },
      },
    });

    await createNotification(
      {
        userId: item.userId,
        type: "PAYOUT_PAID",
        title: "Payout paid",
        body: `You have been paid.`,
        linkUrl: `/dashboard/earnings`,
      },
      tx,
    );

    await writeAudit(
      {
        actorId,
        action: AuditAction.PAYOUT_ITEM_PAID,
        entityType: "PayoutItem",
        entityId: item.id,
        metadata: {
          amountCents: item.amountCents,
          reference: reference ?? null,
        },
      },
      tx,
    );

    // Auto-close batch when all items are settled
    const remaining = await tx.payoutItem.count({
      where: { batchId: item.batchId, status: PayoutItemStatus.PENDING },
    });
    if (remaining === 0) {
      await tx.payoutBatch.update({
        where: { id: item.batchId },
        data: { status: PayoutBatchStatus.PAID, paidAt: now },
      });
      await writeAudit(
        {
          actorId,
          action: AuditAction.PAYOUT_BATCH_PAID,
          entityType: "PayoutBatch",
          entityId: item.batchId,
          metadata: {},
        },
        tx,
      );
    }
  });
}

/** Mark all PENDING items in a batch as PAID in one transaction. */
export async function markBatchPaid(
  batchId: string,
  actorId: string,
): Promise<number> {
  const items = await prisma.payoutItem.findMany({
    where: { batchId, status: PayoutItemStatus.PENDING },
    select: { id: true },
  });
  for (const it of items) {
    await markItemPaid(it.id, actorId);
  }
  return items.length;
}

export async function cancelBatch(
  batchId: string,
  actorId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const batch = await tx.payoutBatch.findUnique({
      where: { id: batchId },
      select: { id: true, status: true },
    });
    if (!batch) throw new PayoutError("BATCH_NOT_FOUND");
    if (
      batch.status !== PayoutBatchStatus.OPEN &&
      batch.status !== PayoutBatchStatus.DRAFT
    ) {
      throw new PayoutError("BATCH_NOT_EDITABLE");
    }

    // Unlock earnings back to PENDING
    await tx.earning.updateMany({
      where: { payoutItem: { batchId } },
      data: { status: EarningStatus.PENDING, payoutItemId: null },
    });

    await tx.payoutItem.updateMany({
      where: { batchId, status: PayoutItemStatus.PENDING },
      data: { status: PayoutItemStatus.CANCELLED },
    });

    await tx.payoutBatch.update({
      where: { id: batch.id },
      data: { status: PayoutBatchStatus.CANCELLED },
    });

    await writeAudit(
      {
        actorId,
        action: AuditAction.PAYOUT_BATCH_UPDATED,
        entityType: "PayoutBatch",
        entityId: batch.id,
        metadata: { cancelled: true },
      },
      tx,
    );
  });
}
