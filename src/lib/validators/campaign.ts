import { z } from "zod";
import { CampaignStatus } from "@prisma/client";

export const campaignCreateSchema = z.object({
  name: z.string().trim().min(3).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(80)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug may contain lowercase letters, digits and dashes only",
    ),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  brand: z.string().trim().max(120).optional().or(z.literal("")),
  status: z.nativeEnum(CampaignStatus).default("DRAFT"),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  budgetCents: z.coerce.number().int().nonnegative().default(0),
});

export const campaignUpdateSchema = campaignCreateSchema.partial().extend({
  id: z.string().cuid(),
});

export const campaignStatusSchema = z.object({
  id: z.string().cuid(),
  status: z.nativeEnum(CampaignStatus),
});

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>;
