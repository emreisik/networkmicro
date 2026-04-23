import { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface AuditInput {
  actorId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

/** Write a single audit row. Safe to call inside or outside a transaction. */
export async function writeAudit(
  input: AuditInput,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  const metadata =
    input.metadata == null
      ? Prisma.JsonNull
      : (JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue);

  await tx.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}
