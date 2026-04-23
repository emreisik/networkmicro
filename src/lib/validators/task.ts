import { z } from "zod";
import {
  Platform,
  TaskActionType,
  TaskStatus,
  SocialAccountType,
} from "@prisma/client";

export const taskCreateSchema = z.object({
  campaignId: z.string().cuid(),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  platform: z.nativeEnum(Platform),
  action: z.nativeEnum(TaskActionType).default("POST"),
  status: z.nativeEnum(TaskStatus).default("DRAFT"),

  rewardCents: z.coerce.number().int().nonnegative().max(1_000_00), // max $1000

  requireScreenshot: z.coerce.boolean().default(true),
  requirePostUrl: z.coerce.boolean().default(false),
  requireCaption: z.coerce.boolean().default(false),
  minFollowers: z.coerce.number().int().nonnegative().default(0),
  minTrustScore: z.coerce.number().int().min(0).max(100).default(0),
  allowedAccountTypes: z.array(z.nativeEnum(SocialAccountType)).default([]),

  maxAssignments: z.coerce.number().int().nonnegative().default(0),
  submissionWindowHours: z.coerce
    .number()
    .int()
    .positive()
    .max(24 * 30)
    .default(24),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),

  instructions: z.string().trim().max(4000).optional().or(z.literal("")),
  caption: z.string().trim().max(4000).optional().or(z.literal("")),
  hashtags: z.string().trim().max(1000).optional().or(z.literal("")),
  linkUrl: z.string().trim().url().max(2048).optional().or(z.literal("")),
});

export const taskUpdateSchema = taskCreateSchema.partial().extend({
  id: z.string().cuid(),
});

export const taskStatusSchema = z.object({
  id: z.string().cuid(),
  status: z.nativeEnum(TaskStatus),
});

export const taskClaimSchema = z.object({
  taskId: z.string().cuid(),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
