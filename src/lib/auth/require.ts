import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth/session";
import { roleAtLeast } from "@/lib/rbac";
import type { Role, User } from "@prisma/client";

export type SessionUser = Pick<
  User,
  | "id"
  | "email"
  | "name"
  | "role"
  | "status"
  | "avatarUrl"
  | "trustScore"
  | "balance"
  | "totalEarned"
  | "approvedCount"
  | "rejectedCount"
>;

export class AuthError extends Error {
  code: "UNAUTHENTICATED" | "FORBIDDEN" | "SUSPENDED";
  constructor(code: AuthError["code"], message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

/** Lightweight session reader. Does NOT hit DB. Use where only the token is needed. */
export async function currentSession() {
  return await readSession();
}

/** Hydrate the session user from DB. Returns null if no valid session or user not found. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const sess = await readSession();
  if (!sess) return null;

  const user = await prisma.user.findUnique({
    where: { id: sess.uid },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      avatarUrl: true,
      trustScore: true,
      balance: true,
      totalEarned: true,
      approvedCount: true,
      rejectedCount: true,
    },
  });
  return user;
}

/** Require an authenticated user. Redirects to /login when missing. */
export async function requireUser(redirectTo = "/login"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  if (user.status === "BANNED" || user.status === "SUSPENDED") {
    redirect("/login?reason=suspended");
  }
  return user;
}

/** Require at least a given role. Redirects to /dashboard when forbidden. */
export async function requireRole(
  minimum: Role,
  redirectTo = "/dashboard",
): Promise<SessionUser> {
  const user = await requireUser();
  if (!roleAtLeast(user.role, minimum)) {
    redirect(redirectTo);
  }
  return user;
}

/** Require admin-area access (REVIEWER or above). */
export async function requireAdminArea(): Promise<SessionUser> {
  return requireRole("REVIEWER", "/dashboard");
}

/** Assert role inside a server action (throws instead of redirecting). */
export async function assertRole(minimum: Role): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  if (user.status === "BANNED" || user.status === "SUSPENDED") {
    throw new AuthError("SUSPENDED");
  }
  if (!roleAtLeast(user.role, minimum)) throw new AuthError("FORBIDDEN");
  return user;
}
