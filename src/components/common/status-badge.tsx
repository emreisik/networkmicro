import {
  SubmissionStatus,
  AssignmentStatus,
  CampaignStatus,
  TaskStatus,
  EarningStatus,
  PayoutBatchStatus,
  PayoutItemStatus,
  UserStatus,
  Platform,
} from "@prisma/client";
import { Badge } from "@/components/ui/badge";

type Variant =
  | "default"
  | "secondary"
  | "destructive"
  | "success"
  | "warning"
  | "outline"
  | "muted";

const submissionMap: Record<
  SubmissionStatus,
  { variant: Variant; label: string }
> = {
  PENDING: { variant: "warning", label: "Pending" },
  APPROVED: { variant: "success", label: "Approved" },
  REJECTED: { variant: "destructive", label: "Rejected" },
  REVISION_REQUESTED: { variant: "secondary", label: "Revision" },
};

const assignmentMap: Record<
  AssignmentStatus,
  { variant: Variant; label: string }
> = {
  CLAIMED: { variant: "secondary", label: "Claimed" },
  SUBMITTED: { variant: "warning", label: "Submitted" },
  APPROVED: { variant: "success", label: "Approved" },
  REJECTED: { variant: "destructive", label: "Rejected" },
  REVISION_REQUESTED: { variant: "secondary", label: "Revision" },
  EXPIRED: { variant: "muted", label: "Expired" },
  CANCELLED: { variant: "muted", label: "Cancelled" },
};

const campaignMap: Record<CampaignStatus, { variant: Variant; label: string }> =
  {
    DRAFT: { variant: "muted", label: "Draft" },
    SCHEDULED: { variant: "secondary", label: "Scheduled" },
    ACTIVE: { variant: "success", label: "Active" },
    PAUSED: { variant: "warning", label: "Paused" },
    COMPLETED: { variant: "outline", label: "Completed" },
    ARCHIVED: { variant: "muted", label: "Archived" },
  };

const taskMap: Record<TaskStatus, { variant: Variant; label: string }> = {
  DRAFT: { variant: "muted", label: "Draft" },
  OPEN: { variant: "success", label: "Open" },
  PAUSED: { variant: "warning", label: "Paused" },
  FULL: { variant: "outline", label: "Full" },
  EXPIRED: { variant: "muted", label: "Expired" },
  ARCHIVED: { variant: "muted", label: "Archived" },
};

const earningMap: Record<EarningStatus, { variant: Variant; label: string }> = {
  PENDING: { variant: "warning", label: "Pending" },
  LOCKED: { variant: "secondary", label: "Locked" },
  PAID: { variant: "success", label: "Paid" },
  CANCELLED: { variant: "muted", label: "Cancelled" },
};

const payoutBatchMap: Record<
  PayoutBatchStatus,
  { variant: Variant; label: string }
> = {
  DRAFT: { variant: "muted", label: "Draft" },
  OPEN: { variant: "warning", label: "Open" },
  PROCESSING: { variant: "secondary", label: "Processing" },
  PAID: { variant: "success", label: "Paid" },
  CANCELLED: { variant: "muted", label: "Cancelled" },
};

const payoutItemMap: Record<
  PayoutItemStatus,
  { variant: Variant; label: string }
> = {
  PENDING: { variant: "warning", label: "Pending" },
  PAID: { variant: "success", label: "Paid" },
  FAILED: { variant: "destructive", label: "Failed" },
  CANCELLED: { variant: "muted", label: "Cancelled" },
};

const userMap: Record<UserStatus, { variant: Variant; label: string }> = {
  ACTIVE: { variant: "success", label: "Active" },
  SUSPENDED: { variant: "warning", label: "Suspended" },
  BANNED: { variant: "destructive", label: "Banned" },
  PENDING_VERIFICATION: { variant: "secondary", label: "Pending" },
};

export function SubmissionStatusBadge({
  status,
}: {
  status: SubmissionStatus;
}) {
  const m = submissionMap[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
export function AssignmentStatusBadge({
  status,
}: {
  status: AssignmentStatus;
}) {
  const m = assignmentMap[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const m = campaignMap[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const m = taskMap[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
export function EarningStatusBadge({ status }: { status: EarningStatus }) {
  const m = earningMap[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
export function PayoutBatchStatusBadge({
  status,
}: {
  status: PayoutBatchStatus;
}) {
  const m = payoutBatchMap[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
export function PayoutItemStatusBadge({
  status,
}: {
  status: PayoutItemStatus;
}) {
  const m = payoutItemMap[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
export function UserStatusBadge({ status }: { status: UserStatus }) {
  const m = userMap[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export function PlatformBadge({ platform }: { platform: Platform }) {
  return <Badge variant="outline">{platform}</Badge>;
}
