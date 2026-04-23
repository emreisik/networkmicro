import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { verifySession, type SessionPayload } from "@/lib/auth/jwt";

export { signSession, verifySession } from "@/lib/auth/jwt";
export type { SessionPayload } from "@/lib/auth/jwt";

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(env.AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: env.AUTH_SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(env.AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(env.AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}
