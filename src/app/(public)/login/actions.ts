"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { signSession, setSessionCookie } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validators/auth";
import { writeAudit } from "@/services/audit";
import { AuditAction } from "@prisma/client";

export interface LoginState {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        email: fe.email?.[0],
        password: fe.password?.[0],
      },
    };
  }

  const from =
    typeof formData.get("from") === "string"
      ? (formData.get("from") as string)
      : null;

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      passwordHash: true,
    },
  });

  if (!user) return { error: "Invalid email or password" };
  if (user.status === "BANNED") return { error: "Account banned" };
  if (user.status === "SUSPENDED") return { error: "Account suspended" };

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return { error: "Invalid email or password" };

  const token = await signSession({
    uid: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });
  await setSessionCookie(token);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });
  await writeAudit({
    actorId: user.id,
    action: AuditAction.USER_LOGIN,
    entityType: "User",
    entityId: user.id,
  });

  const target =
    from && from.startsWith("/") && !from.startsWith("//")
      ? from
      : "/dashboard";
  redirect(target);
}
