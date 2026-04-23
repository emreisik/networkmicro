import { z } from "zod";
import {
  Platform,
  SocialAccountType,
  SocialAccountStatus,
} from "@prisma/client";

export const socialAccountCreateSchema = z.object({
  platform: z.nativeEnum(Platform),
  username: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[^\s]+$/, "Username cannot contain whitespace"),
  profileUrl: z.string().trim().url().max(2048),
  followerCount: z.coerce.number().int().nonnegative().default(0),
  accountType: z.nativeEnum(SocialAccountType).default("PERSONAL"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const socialAccountUpdateSchema = socialAccountCreateSchema
  .partial()
  .extend({
    id: z.string().cuid(),
    status: z.nativeEnum(SocialAccountStatus).optional(),
  });

export type SocialAccountCreateInput = z.infer<
  typeof socialAccountCreateSchema
>;
export type SocialAccountUpdateInput = z.infer<
  typeof socialAccountUpdateSchema
>;
