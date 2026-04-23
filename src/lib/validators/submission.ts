import { z } from "zod";

export const submissionCreateSchema = z.object({
  taskId: z.string().cuid(),
  socialAccountId: z.string().cuid().optional(),
  postUrl: z.string().trim().url().max(2048).optional().or(z.literal("")),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const submissionReviewSchema = z.object({
  submissionId: z.string().cuid(),
  action: z.enum(["APPROVE", "REJECT", "REVISION"]),
  reviewNote: z.string().trim().max(2000).optional().or(z.literal("")),
  rejectReason: z.string().trim().max(500).optional().or(z.literal("")),
  flagged: z.coerce.boolean().optional(),
});

export type SubmissionReviewInput = z.infer<typeof submissionReviewSchema>;
export type SubmissionCreateInput = z.infer<typeof submissionCreateSchema>;
