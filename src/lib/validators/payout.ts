import { z } from "zod";
import { PayoutItemStatus, PayoutBatchStatus } from "@prisma/client";

export const payoutBatchCreateSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .refine((v) => v.periodEnd > v.periodStart, {
    path: ["periodEnd"],
    message: "Period end must be after start",
  });

export const payoutBatchUpdateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().min(3).max(120).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.nativeEnum(PayoutBatchStatus).optional(),
});

export const payoutItemUpdateSchema = z.object({
  id: z.string().cuid(),
  status: z.nativeEnum(PayoutItemStatus),
  reference: z.string().trim().max(240).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type PayoutBatchCreateInput = z.infer<typeof payoutBatchCreateSchema>;
