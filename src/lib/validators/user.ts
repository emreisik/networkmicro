import { z } from "zod";
import { Role, UserStatus } from "@prisma/client";

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
});

export const userAdminUpdateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().min(2).max(80).optional(),
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  dailyTaskLimit: z.coerce.number().int().min(0).max(1000).optional(),
  weeklyTaskLimit: z.coerce.number().int().min(0).max(10000).optional(),
  trustScoreAdjustment: z.coerce.number().int().min(-100).max(100).optional(),
  adjustmentNote: z.string().trim().max(500).optional().or(z.literal("")),
});

export const passwordChangeSchema = z
  .object({
    current: z.string().min(8).max(128),
    next: z.string().min(8).max(128),
    confirm: z.string().min(8).max(128),
  })
  .refine((v) => v.next === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type UserAdminUpdateInput = z.infer<typeof userAdminUpdateSchema>;
