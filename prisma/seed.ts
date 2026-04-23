import {
  PrismaClient,
  Role,
  Platform,
  SocialAccountType,
  CampaignStatus,
  TaskStatus,
  TaskActionType,
  AssignmentStatus,
  SubmissionStatus,
  EarningStatus,
  PayoutBatchStatus,
  PayoutItemStatus,
  NotificationType,
  TrustScoreReason,
  AuditAction,
  Prisma,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}

function hoursFromNow(n: number): Date {
  return new Date(Date.now() + n * 60 * 60 * 1000);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function hash(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

function imageUrl(seed: string, w = 800, h = 1000): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

// ------------------------------------------------------------
// Data pools
// ------------------------------------------------------------

const CAMPAIGN_TEMPLATES: Array<{
  name: string;
  brand: string;
  description: string;
  status: CampaignStatus;
  tasks: Array<{
    title: string;
    platform: Platform;
    action: TaskActionType;
    rewardCents: number;
    minFollowers: number;
    minTrustScore: number;
    requirePostUrl: boolean;
    maxAssignments: number;
    submissionWindowHours: number;
    instructions: string;
    caption: string;
    hashtags: string;
    linkUrl?: string;
  }>;
}> = [
  {
    name: "Launch Week",
    brand: "Acme Labs",
    description:
      "Announce our new dev tooling release across developer communities.",
    status: "ACTIVE",
    tasks: [
      {
        title: "Instagram feed post about Acme launch",
        platform: "INSTAGRAM",
        action: "POST",
        rewardCents: 1200,
        minFollowers: 1000,
        minTrustScore: 30,
        requirePostUrl: true,
        maxAssignments: 40,
        submissionWindowHours: 48,
        instructions:
          "Post on your main feed. Keep the post live for at least 7 days. Tag @acme.labs.",
        caption: "Just shipped with Acme — feels like home. #AcmeLaunch",
        hashtags: "#AcmeLaunch #DevTools #Shipping",
        linkUrl: "https://acme.example.com/launch",
      },
      {
        title: "TikTok short review of Acme CLI",
        platform: "TIKTOK",
        action: "REEL",
        rewardCents: 2500,
        minFollowers: 3000,
        minTrustScore: 40,
        requirePostUrl: true,
        maxAssignments: 20,
        submissionWindowHours: 72,
        instructions:
          "15-30s review focusing on the CLI UX. Voiceover required.",
        caption: "Stop typing 40 keystrokes for a commit. This is how.",
        hashtags: "#AcmeLaunch #DevTok",
        linkUrl: "https://acme.example.com/launch",
      },
      {
        title: "X (Twitter) thread on Acme workflow",
        platform: "X",
        action: "POST",
        rewardCents: 1500,
        minFollowers: 500,
        minTrustScore: 20,
        requirePostUrl: true,
        maxAssignments: 50,
        submissionWindowHours: 48,
        instructions:
          "Minimum 4-tweet thread. Start with the hook. Include a screenshot.",
        caption: "I rewrote our pipeline with Acme. Here is what changed:",
        hashtags: "#AcmeLaunch",
      },
    ],
  },
  {
    name: "Holiday Coffee Drop",
    brand: "Arkaplan Coffee",
    description: "Seasonal coffee drop — generate buzz before the holidays.",
    status: "ACTIVE",
    tasks: [
      {
        title: "Instagram story with product photo",
        platform: "INSTAGRAM",
        action: "STORY",
        rewardCents: 800,
        minFollowers: 500,
        minTrustScore: 25,
        requirePostUrl: false,
        maxAssignments: 80,
        submissionWindowHours: 48,
        instructions:
          "Take a cozy shot with the holiday blend. Tag @arkaplancoffee.",
        caption: "Winter in a cup",
        hashtags: "#ArkaplanHoliday #Coffee",
      },
      {
        title: "YouTube Shorts unboxing",
        platform: "YOUTUBE",
        action: "REEL",
        rewardCents: 3500,
        minFollowers: 10000,
        minTrustScore: 50,
        requirePostUrl: true,
        maxAssignments: 8,
        submissionWindowHours: 96,
        instructions: "Unbox the holiday set. 30-60s Short. Natural light.",
        caption: "This arrived today and smells incredible",
        hashtags: "#ArkaplanHoliday #Shorts",
        linkUrl: "https://arkaplan.example.com/holiday",
      },
    ],
  },
  {
    name: "FinBridge Referral Push",
    brand: "FinBridge",
    description:
      "Referral-driven onboarding campaign for the new card product.",
    status: "PAUSED",
    tasks: [
      {
        title: "LinkedIn post about FinBridge card",
        platform: "LINKEDIN",
        action: "POST",
        rewardCents: 2000,
        minFollowers: 800,
        minTrustScore: 40,
        requirePostUrl: true,
        maxAssignments: 30,
        submissionWindowHours: 96,
        instructions: "Share your honest experience with the card.",
        caption: "Switched my business card to FinBridge. Reasons:",
        hashtags: "#FinBridge #Fintech",
      },
    ],
  },
  {
    name: "Voltec EV Charger",
    brand: "Voltec",
    description: "Product awareness for the home EV charger line.",
    status: "DRAFT",
    tasks: [],
  },
];

const USERS_PLAN: Array<{
  email: string;
  name: string;
  password: string;
  role: Role;
  trust?: number;
  approved?: number;
  rejected?: number;
  totalEarned?: number;
  totalPaid?: number;
  balance?: number;
  dailyTaskLimit?: number;
  weeklyTaskLimit?: number;
  country?: string;
  bio?: string;
  phone?: string;
}> = [
  {
    email: "super@networkmikro.local",
    name: "Super Admin",
    password: "SuperAdmin123!",
    role: "SUPER_ADMIN",
    trust: 95,
  },
  {
    email: "admin@networkmikro.local",
    name: "Ayşe Demir",
    password: "Admin1234!",
    role: "ADMIN",
    trust: 90,
    country: "TR",
    bio: "Campaign ops lead.",
  },
  {
    email: "reviewer@networkmikro.local",
    name: "Kerem Yılmaz",
    password: "Reviewer1234!",
    role: "REVIEWER",
    trust: 85,
    country: "TR",
    bio: "Senior reviewer.",
  },
  {
    email: "brand@acme.local",
    name: "Acme Labs",
    password: "Brand1234!",
    role: "BRAND",
    trust: 70,
  },

  // High performers
  {
    email: "ada@networkmikro.local",
    name: "Ada Lovelace",
    password: "User1234!",
    role: "USER",
    trust: 88,
    approved: 42,
    rejected: 2,
    totalEarned: 48000,
    totalPaid: 32000,
    balance: 16000,
    country: "GB",
    bio: "I write about math-y software and post sometimes.",
  },
  {
    email: "grace@networkmikro.local",
    name: "Grace Hopper",
    password: "User1234!",
    role: "USER",
    trust: 92,
    approved: 58,
    rejected: 1,
    totalEarned: 72500,
    totalPaid: 60000,
    balance: 12500,
    country: "US",
    bio: "Compiler person. TikTok about retro computing.",
  },
  {
    email: "linus@networkmikro.local",
    name: "Linus Torvalds",
    password: "User1234!",
    role: "USER",
    trust: 78,
    approved: 21,
    rejected: 4,
    totalEarned: 26000,
    totalPaid: 26000,
    balance: 0,
    country: "FI",
  },

  // Regular
  {
    email: "selin@networkmikro.local",
    name: "Selin Kaya",
    password: "User1234!",
    role: "USER",
    trust: 65,
    approved: 12,
    rejected: 3,
    totalEarned: 13500,
    totalPaid: 10000,
    balance: 3500,
    country: "TR",
  },
  {
    email: "ege@networkmikro.local",
    name: "Ege Arslan",
    password: "User1234!",
    role: "USER",
    trust: 58,
    approved: 9,
    rejected: 2,
    totalEarned: 10200,
    totalPaid: 8000,
    balance: 2200,
    country: "TR",
  },
  {
    email: "mila@networkmikro.local",
    name: "Mila Novak",
    password: "User1234!",
    role: "USER",
    trust: 52,
    approved: 6,
    rejected: 2,
    totalEarned: 7200,
    totalPaid: 0,
    balance: 7200,
    country: "NL",
  },

  // Low / risky
  {
    email: "deniz@networkmikro.local",
    name: "Deniz Çelik",
    password: "User1234!",
    role: "USER",
    trust: 24,
    approved: 2,
    rejected: 9,
    totalEarned: 2400,
    totalPaid: 2400,
    balance: 0,
    country: "TR",
  },
  {
    email: "emir@networkmikro.local",
    name: "Emir Yıldız",
    password: "User1234!",
    role: "USER",
    trust: 18,
    approved: 1,
    rejected: 11,
    totalEarned: 1200,
    totalPaid: 0,
    balance: 1200,
    country: "TR",
  },

  // Fresh
  {
    email: "elif@networkmikro.local",
    name: "Elif Koç",
    password: "User1234!",
    role: "USER",
    trust: 50,
    approved: 0,
    rejected: 0,
    totalEarned: 0,
    totalPaid: 0,
    balance: 0,
    country: "TR",
  },
];

// ------------------------------------------------------------
// Reset (demo data only)
// ------------------------------------------------------------

async function reset() {
  // Order matters — children first because of non-cascaded relations
  await prisma.$transaction([
    prisma.auditLog.deleteMany({}),
    prisma.notification.deleteMany({}),
    prisma.trustScoreLog.deleteMany({}),
    prisma.earning.deleteMany({}),
    prisma.payoutItem.deleteMany({}),
    prisma.payoutBatch.deleteMany({}),
    prisma.submission.deleteMany({}),
    prisma.taskAssignment.deleteMany({}),
    prisma.task.deleteMany({}),
    prisma.campaignAsset.deleteMany({}),
    prisma.campaign.deleteMany({}),
    prisma.socialAccount.deleteMany({}),
    prisma.systemSetting.deleteMany({}),
    prisma.user.deleteMany({}),
  ]);
}

// ------------------------------------------------------------
// Seed
// ------------------------------------------------------------

async function main() {
  console.log("Resetting…");
  await reset();

  console.log("Users…");
  const users = await Promise.all(
    USERS_PLAN.map(async (u) =>
      prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          passwordHash: await hash(u.password),
          role: u.role,
          status: "ACTIVE",
          trustScore: u.trust ?? 50,
          approvedCount: u.approved ?? 0,
          rejectedCount: u.rejected ?? 0,
          totalEarned: u.totalEarned ?? 0,
          totalPaid: u.totalPaid ?? 0,
          balance: u.balance ?? 0,
          currentStreak: Math.min(5, u.approved ?? 0),
          dailyTaskLimit: u.dailyTaskLimit ?? 5,
          weeklyTaskLimit: u.weeklyTaskLimit ?? 25,
          country: u.country ?? null,
          bio: u.bio ?? null,
          phone: u.phone ?? null,
          lastActiveAt: hoursAgo(randomInt(0, 72)),
        },
      }),
    ),
  );
  const byEmail = new Map(users.map((u) => [u.email, u]));

  console.log("Trust score initial logs…");
  for (const u of users) {
    await prisma.trustScoreLog.create({
      data: {
        userId: u.id,
        delta: 0,
        before: u.trustScore,
        after: u.trustScore,
        reason: TrustScoreReason.INITIAL,
        note: "Seeded initial score",
      },
    });
  }

  console.log("Social accounts…");
  const platformSeeds: Platform[] = [
    "INSTAGRAM",
    "TIKTOK",
    "X",
    "YOUTUBE",
    "LINKEDIN",
  ];
  for (const u of users.filter((x) => x.role === "USER")) {
    const n = randomInt(1, 2);
    const chosen = new Set<Platform>();
    for (let i = 0; i < n; i++) {
      let p = pick(platformSeeds);
      while (chosen.has(p)) p = pick(platformSeeds);
      chosen.add(p);
      const first = u.name.split(" ")[0] ?? "user";
      const handle = slugify(first) + randomInt(10, 99);
      await prisma.socialAccount.create({
        data: {
          userId: u.id,
          platform: p,
          username: handle,
          profileUrl: `https://${p.toLowerCase()}.com/${handle}`,
          followerCount: randomInt(500, 80_000),
          accountType: pick([
            "PERSONAL",
            "CREATOR",
            "BUSINESS",
          ] as SocialAccountType[]),
          verified: Math.random() > 0.8,
          status: "ACTIVE",
        },
      });
    }
  }

  console.log("Campaigns, assets, tasks…");
  const admin = byEmail.get("admin@networkmikro.local")!;
  const taskRecords: Array<{
    taskId: string;
    rewardCents: number;
    platform: Platform;
    submissionWindowHours: number;
  }> = [];

  for (const tpl of CAMPAIGN_TEMPLATES) {
    const campaign = await prisma.campaign.create({
      data: {
        name: tpl.name,
        slug: slugify(tpl.name),
        description: tpl.description,
        brand: tpl.brand,
        status: tpl.status,
        startsAt:
          tpl.status === "DRAFT"
            ? hoursFromNow(24 * 3)
            : daysAgo(randomInt(3, 14)),
        endsAt:
          tpl.status === "ACTIVE" ? hoursFromNow(24 * randomInt(10, 30)) : null,
        budgetCents: randomInt(50_000, 500_000),
        createdById: admin.id,
      },
    });

    const assetCount = tpl.tasks.length > 0 ? randomInt(1, 3) : 0;
    for (let i = 0; i < assetCount; i++) {
      const seed = `${campaign.slug}-asset-${i}`;
      await prisma.campaignAsset.create({
        data: {
          campaignId: campaign.id,
          title: `Brief ${i + 1}`,
          fileUrl: imageUrl(seed, 1200, 800),
          fileKey: `campaigns/seed/${campaign.id}/${seed}.jpg`,
          mimeType: "image/jpeg",
          sizeBytes: randomInt(100_000, 800_000),
          caption: i === 0 ? "Primary creative direction." : null,
          hashtags: i === 0 ? "#brand #creative" : null,
          instructions:
            i === 0
              ? "Use the primary asset. Do not crop the logo area."
              : null,
        },
      });
    }

    const taskStatus: TaskStatus =
      tpl.status === "ACTIVE"
        ? "OPEN"
        : tpl.status === "PAUSED"
          ? "PAUSED"
          : "DRAFT";

    for (const t of tpl.tasks) {
      const task = await prisma.task.create({
        data: {
          campaignId: campaign.id,
          title: t.title,
          description: `Seeded task for ${campaign.name}.`,
          platform: t.platform,
          action: t.action,
          status: taskStatus,
          rewardCents: t.rewardCents,
          requireScreenshot: true,
          requirePostUrl: t.requirePostUrl,
          requireCaption: false,
          minFollowers: t.minFollowers,
          minTrustScore: t.minTrustScore,
          allowedAccountTypes: [],
          maxAssignments: t.maxAssignments,
          submissionWindowHours: t.submissionWindowHours,
          startsAt: daysAgo(5),
          endsAt: hoursFromNow(24 * 20),
          instructions: t.instructions,
          caption: t.caption,
          hashtags: t.hashtags,
          linkUrl: t.linkUrl ?? null,
        },
      });
      taskRecords.push({
        taskId: task.id,
        rewardCents: task.rewardCents,
        platform: task.platform,
        submissionWindowHours: task.submissionWindowHours,
      });
    }
  }

  console.log("Assignments, submissions, earnings…");
  const realUsers = users.filter((u) => u.role === "USER");
  const reviewer = byEmail.get("reviewer@networkmikro.local")!;
  const createdEarnings: Array<{
    id: string;
    userId: string;
    amountCents: number;
    createdAt: Date;
  }> = [];

  const OUTCOMES = [
    "APPROVED",
    "APPROVED",
    "APPROVED",
    "REJECTED",
    "REVISION_REQUESTED",
    "SUBMITTED",
    "CLAIMED",
  ] as const;
  type Outcome = (typeof OUTCOMES)[number];

  for (const u of realUsers) {
    const socialAccount = await prisma.socialAccount.findFirst({
      where: { userId: u.id },
      select: { id: true },
    });
    const assignmentCount = randomInt(3, 6);

    for (let i = 0; i < assignmentCount; i++) {
      if (taskRecords.length === 0) break;
      const t = pick(taskRecords);

      const exists = await prisma.taskAssignment.findUnique({
        where: { taskId_userId: { taskId: t.taskId, userId: u.id } },
        select: { id: true },
      });
      if (exists) continue;

      const outcome: Outcome = pick(OUTCOMES);

      const claimedAt = daysAgo(randomInt(1, 20));
      const deadlineAt = new Date(
        claimedAt.getTime() + t.submissionWindowHours * 60 * 60 * 1000,
      );

      const assignment = await prisma.taskAssignment.create({
        data: {
          taskId: t.taskId,
          userId: u.id,
          status:
            outcome === "SUBMITTED"
              ? AssignmentStatus.SUBMITTED
              : outcome === "APPROVED"
                ? AssignmentStatus.APPROVED
                : outcome === "REJECTED"
                  ? AssignmentStatus.REJECTED
                  : outcome === "REVISION_REQUESTED"
                    ? AssignmentStatus.REVISION_REQUESTED
                    : AssignmentStatus.CLAIMED,
          claimedAt,
          deadlineAt,
        },
      });

      await prisma.task.update({
        where: { id: t.taskId },
        data: { assignedCount: { increment: 1 } },
      });

      if (outcome === "CLAIMED") continue;

      const submittedAt = new Date(
        claimedAt.getTime() +
          randomInt(2, Math.max(3, t.submissionWindowHours - 2)) *
            60 *
            60 *
            1000,
      );
      const screenshotSeed = `${assignment.id}`;

      const statusMap: Record<Exclude<Outcome, "CLAIMED">, SubmissionStatus> = {
        APPROVED: SubmissionStatus.APPROVED,
        REJECTED: SubmissionStatus.REJECTED,
        REVISION_REQUESTED: SubmissionStatus.REVISION_REQUESTED,
        SUBMITTED: SubmissionStatus.PENDING,
      };

      const reviewedAt =
        outcome === "APPROVED" ||
        outcome === "REJECTED" ||
        outcome === "REVISION_REQUESTED"
          ? new Date(submittedAt.getTime() + randomInt(1, 24) * 60 * 60 * 1000)
          : null;

      const submission = await prisma.submission.create({
        data: {
          taskId: t.taskId,
          userId: u.id,
          socialAccountId: socialAccount?.id ?? null,
          status: statusMap[outcome],
          screenshotUrl: imageUrl(screenshotSeed, 720, 1280),
          screenshotKey: `submissions/seed/${u.id}/${assignment.id}.jpg`,
          screenshotMime: "image/jpeg",
          screenshotSize: randomInt(200_000, 900_000),
          postUrl: `https://${t.platform.toLowerCase()}.example.com/post/${randomInt(100000, 999999)}`,
          note:
            outcome === "REVISION_REQUESTED"
              ? "Reuploaded after the first round of feedback."
              : null,
          reviewerId: reviewedAt ? reviewer.id : null,
          reviewedAt,
          reviewNote:
            outcome === "APPROVED"
              ? pick([
                  "Looks good.",
                  "Clean execution.",
                  "Approved — great reach.",
                ])
              : outcome === "REVISION_REQUESTED"
                ? "Please reshoot in natural light and retry."
                : outcome === "REJECTED"
                  ? "Doesn't meet brief."
                  : null,
          rejectReason:
            outcome === "REJECTED"
              ? pick([
                  "Missing required hashtag.",
                  "Screenshot doesn't show the post live.",
                  "Post was taken down too early.",
                ])
              : null,
          flagged: outcome === "REJECTED" && Math.random() > 0.7,
          submittedAt,
        },
      });

      await prisma.taskAssignment.update({
        where: { id: assignment.id },
        data: {
          submittedAt,
          reviewedAt,
          submissionId: submission.id,
        },
      });

      if (outcome === "APPROVED") {
        await prisma.task.update({
          where: { id: t.taskId },
          data: { approvedCount: { increment: 1 } },
        });

        const earningCreatedAt = reviewedAt ?? submittedAt;
        const earning = await prisma.earning.create({
          data: {
            userId: u.id,
            submissionId: submission.id,
            amountCents: t.rewardCents,
            status: EarningStatus.PENDING,
            createdAt: earningCreatedAt,
          },
        });
        createdEarnings.push({
          id: earning.id,
          userId: u.id,
          amountCents: t.rewardCents,
          createdAt: earningCreatedAt,
        });

        await prisma.trustScoreLog.create({
          data: {
            userId: u.id,
            delta: 2,
            before: u.trustScore - 2,
            after: u.trustScore,
            reason: TrustScoreReason.SUBMISSION_APPROVED,
            refType: "Submission",
            refId: submission.id,
            createdAt: earningCreatedAt,
          },
        });
      }

      if (outcome === "REJECTED") {
        await prisma.trustScoreLog.create({
          data: {
            userId: u.id,
            delta: -5,
            before: u.trustScore + 5,
            after: u.trustScore,
            reason: TrustScoreReason.SUBMISSION_REJECTED,
            refType: "Submission",
            refId: submission.id,
            createdAt: reviewedAt ?? submittedAt,
          },
        });
      }

      if (outcome === "REVISION_REQUESTED") {
        await prisma.trustScoreLog.create({
          data: {
            userId: u.id,
            delta: -2,
            before: u.trustScore + 2,
            after: u.trustScore,
            reason: TrustScoreReason.SUBMISSION_REVISION,
            refType: "Submission",
            refId: submission.id,
            createdAt: reviewedAt ?? submittedAt,
          },
        });
      }

      if (reviewedAt) {
        const notiMap: Record<
          "APPROVED" | "REJECTED" | "REVISION_REQUESTED",
          { type: NotificationType; title: string; body: string }
        > = {
          APPROVED: {
            type: NotificationType.SUBMISSION_APPROVED,
            title: "Submission approved",
            body: "Your submission was approved. Earnings added.",
          },
          REJECTED: {
            type: NotificationType.SUBMISSION_REJECTED,
            title: "Submission rejected",
            body: submission.rejectReason ?? "Rejected.",
          },
          REVISION_REQUESTED: {
            type: NotificationType.SUBMISSION_REVISION,
            title: "Revision requested",
            body: submission.reviewNote ?? "Please revise.",
          },
        };
        const m =
          notiMap[outcome as "APPROVED" | "REJECTED" | "REVISION_REQUESTED"];
        await prisma.notification.create({
          data: {
            userId: u.id,
            type: m.type,
            title: m.title,
            body: m.body,
            linkUrl: "/dashboard/submissions",
            readAt: Math.random() > 0.5 ? hoursAgo(randomInt(0, 48)) : null,
            createdAt: reviewedAt,
          },
        });
      }
    }
  }

  console.log("Welcome notifications…");
  for (const u of realUsers) {
    await prisma.notification.create({
      data: {
        userId: u.id,
        type: NotificationType.WELCOME,
        title: "Welcome to Network Mikro",
        body: "Add a social account and claim your first task.",
        linkUrl: "/dashboard/social-accounts",
        readAt: hoursAgo(randomInt(1, 200)),
        createdAt: daysAgo(randomInt(3, 40)),
      },
    });
  }

  console.log("Paid payout batch (previous week)…");
  const priorEarnings = createdEarnings.filter(
    (e) => e.createdAt <= daysAgo(7),
  );
  if (priorEarnings.length > 0) {
    const periodEnd = daysAgo(7);
    const periodStart = daysAgo(14);

    const batch = await prisma.payoutBatch.create({
      data: {
        name: `Weekly payout ${periodEnd.toISOString().slice(0, 10)}`,
        periodStart,
        periodEnd,
        status: PayoutBatchStatus.PAID,
        createdById: admin.id,
        paidAt: daysAgo(6),
        notes: "Seeded prior week.",
      },
    });

    const grouped = new Map<string, { ids: string[]; total: number }>();
    for (const e of priorEarnings) {
      const g = grouped.get(e.userId) ?? { ids: [], total: 0 };
      g.ids.push(e.id);
      g.total += e.amountCents;
      grouped.set(e.userId, g);
    }

    let batchTotal = 0;
    let itemCount = 0;
    for (const [userId, g] of grouped) {
      const item = await prisma.payoutItem.create({
        data: {
          batchId: batch.id,
          userId,
          amountCents: g.total,
          status: PayoutItemStatus.PAID,
          paidAt: daysAgo(6),
          reference: `TRX-${randomInt(100000, 999999)}`,
        },
      });
      await prisma.earning.updateMany({
        where: { id: { in: g.ids } },
        data: { status: EarningStatus.PAID, payoutItemId: item.id },
      });
      await prisma.notification.create({
        data: {
          userId,
          type: NotificationType.PAYOUT_PAID,
          title: "Payout paid",
          body: `Weekly payout settled: ${(g.total / 100).toFixed(2)} USD.`,
          linkUrl: "/dashboard/earnings",
          readAt: hoursAgo(randomInt(0, 72)),
          createdAt: daysAgo(6),
        },
      });
      batchTotal += g.total;
      itemCount += 1;
    }

    await prisma.payoutBatch.update({
      where: { id: batch.id },
      data: { totalCents: batchTotal, itemCount },
    });
  }

  console.log("Open payout batch (current week)…");
  const currentEarnings = createdEarnings.filter(
    (e) => e.createdAt > daysAgo(7),
  );
  if (currentEarnings.length > 0) {
    const batch = await prisma.payoutBatch.create({
      data: {
        name: `Weekly payout ${new Date().toISOString().slice(0, 10)}`,
        periodStart: daysAgo(7),
        periodEnd: new Date(),
        status: PayoutBatchStatus.OPEN,
        createdById: admin.id,
      },
    });

    const grouped = new Map<string, { ids: string[]; total: number }>();
    for (const e of currentEarnings) {
      const g = grouped.get(e.userId) ?? { ids: [], total: 0 };
      g.ids.push(e.id);
      g.total += e.amountCents;
      grouped.set(e.userId, g);
    }

    let batchTotal = 0;
    let itemCount = 0;
    for (const [userId, g] of grouped) {
      const item = await prisma.payoutItem.create({
        data: {
          batchId: batch.id,
          userId,
          amountCents: g.total,
          status: PayoutItemStatus.PENDING,
        },
      });
      await prisma.earning.updateMany({
        where: { id: { in: g.ids } },
        data: { status: EarningStatus.LOCKED, payoutItemId: item.id },
      });
      batchTotal += g.total;
      itemCount += 1;
    }

    await prisma.payoutBatch.update({
      where: { id: batch.id },
      data: { totalCents: batchTotal, itemCount },
    });
  }

  console.log("System settings…");
  await prisma.systemSetting.createMany({
    data: [
      {
        key: "default.daily.limit",
        value: 5 as unknown as Prisma.InputJsonValue,
      },
      {
        key: "default.weekly.limit",
        value: 25 as unknown as Prisma.InputJsonValue,
      },
      {
        key: "trust.penalty.fake",
        value: -15 as unknown as Prisma.InputJsonValue,
      },
      {
        key: "payout.schedule",
        value: "weekly" as unknown as Prisma.InputJsonValue,
      },
    ],
  });

  console.log("Audit log samples…");
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        action: AuditAction.USER_LOGIN,
        entityType: "User",
        entityId: admin.id,
        ip: "127.0.0.1",
        userAgent: "seed",
        createdAt: daysAgo(1),
      },
      {
        actorId: admin.id,
        action: AuditAction.CAMPAIGN_CREATED,
        entityType: "Campaign",
        entityId: null,
        metadata: { note: "Seeded" } as Prisma.InputJsonValue,
        createdAt: daysAgo(14),
      },
      {
        actorId: reviewer.id,
        action: AuditAction.USER_LOGIN,
        entityType: "User",
        entityId: reviewer.id,
        ip: "127.0.0.1",
        userAgent: "seed",
        createdAt: hoursAgo(6),
      },
    ],
  });

  console.log("Seed complete.");
  console.log("Credentials:");
  for (const u of USERS_PLAN) {
    console.log(`  ${u.email.padEnd(34)} / ${u.password.padEnd(18)} ${u.role}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
