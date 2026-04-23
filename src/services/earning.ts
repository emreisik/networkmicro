import { Prisma, EarningStatus, AuditAction } from "@prisma/client";
import { writeAudit } from "@/services/audit";

export interface CreateEarningInput {
  userId: string;
  submissionId: string;
  amountCents: number;
}

/** Create an earning row and increment user aggregates. Caller supplies the transaction client. */
export async function createEarning(
  tx: Prisma.TransactionClient,
  input: CreateEarningInput,
): Promise<string> {
  const earning = await tx.earning.create({
    data: {
      userId: input.userId,
      submissionId: input.submissionId,
      amountCents: input.amountCents,
      status: EarningStatus.PENDING,
    },
    select: { id: true },
  });

  await tx.user.update({
    where: { id: input.userId },
    data: {
      totalEarned: { increment: input.amountCents },
      balance: { increment: input.amountCents },
    },
  });

  await writeAudit(
    {
      actorId: null,
      action: AuditAction.EARNING_CREATED,
      entityType: "Earning",
      entityId: earning.id,
      metadata: {
        amountCents: input.amountCents,
        submissionId: input.submissionId,
      },
    },
    tx,
  );

  return earning.id;
}

/** Cancel a pending/locked earning (only allowed when not yet PAID). */
export async function cancelEarning(
  tx: Prisma.TransactionClient,
  earningId: string,
  actorId: string,
) {
  const earning = await tx.earning.findUniqueOrThrow({
    where: { id: earningId },
    select: { id: true, userId: true, amountCents: true, status: true },
  });

  if (earning.status === "PAID") {
    throw new Error("Cannot cancel a paid earning");
  }
  if (earning.status === "CANCELLED") return;

  await tx.earning.update({
    where: { id: earning.id },
    data: { status: "CANCELLED" },
  });

  await tx.user.update({
    where: { id: earning.userId },
    data: {
      totalEarned: { decrement: earning.amountCents },
      balance: { decrement: earning.amountCents },
    },
  });

  await writeAudit(
    {
      actorId,
      action: AuditAction.EARNING_CANCELLED,
      entityType: "Earning",
      entityId: earning.id,
      metadata: { amountCents: earning.amountCents },
    },
    tx,
  );
}
