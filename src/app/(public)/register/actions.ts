"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { signSession, setSessionCookie } from "@/lib/auth/session";
import { registerSchema } from "@/lib/validators/auth";
import { writeAudit } from "@/services/audit";
import { createNotification } from "@/services/notification";
import { applyTrustDelta, TRUST_DEFAULT } from "@/services/trust-score";
import { AuditAction } from "@prisma/client";

export interface RegisterState {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "password", string>>;
}

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        name: fe.name?.[0],
        email: fe.email?.[0],
        password: fe.password?.[0],
      },
    };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (existing) return { error: "An account with that email already exists" };

  const passwordHash = await hashPassword(parsed.data.password);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash,
        role: "USER",
        status: "ACTIVE",
        trustScore: TRUST_DEFAULT,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    await applyTrustDelta(tx, {
      userId: u.id,
      reason: "INITIAL",
      delta: 0,
      note: `Initial trust score set to ${TRUST_DEFAULT}`,
    });

    await createNotification(
      {
        userId: u.id,
        type: "WELCOME",
        title: "Welcome to Network Mikro",
        body: "Start by adding a social account, then claim your first task.",
        linkUrl: "/dashboard/social-accounts",
      },
      tx,
    );

    await writeAudit(
      {
        actorId: u.id,
        action: AuditAction.USER_CREATED,
        entityType: "User",
        entityId: u.id,
        metadata: { email: u.email },
      },
      tx,
    );

    return u;
  });

  const token = await signSession({
    uid: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });
  await setSessionCookie(token);
  redirect("/dashboard");
}
