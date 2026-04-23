import { Role } from "@prisma/client";

// Descending seniority. Greater number = more privilege.
const rank: Record<Role, number> = {
  USER: 10,
  BRAND: 20,
  REVIEWER: 40,
  ADMIN: 80,
  SUPER_ADMIN: 100,
};

export function roleAtLeast(actor: Role, required: Role): boolean {
  return rank[actor] >= rank[required];
}

export function isAdmin(role: Role): boolean {
  return roleAtLeast(role, "ADMIN");
}

export function canReview(role: Role): boolean {
  return roleAtLeast(role, "REVIEWER");
}

export function canManageUsers(role: Role): boolean {
  return roleAtLeast(role, "ADMIN");
}

export function canManagePayouts(role: Role): boolean {
  return roleAtLeast(role, "ADMIN");
}

export function canAccessAdminArea(role: Role): boolean {
  return roleAtLeast(role, "REVIEWER");
}

export function canChangeRole(actor: Role, target: Role): boolean {
  return rank[actor] > rank[target] && roleAtLeast(actor, "ADMIN");
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  REVIEWER: "Reviewer",
  BRAND: "Brand",
  USER: "User",
};
