import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "@/lib/env";
import type { Role } from "@prisma/client";

const secret = new TextEncoder().encode(env.AUTH_SECRET);
const alg = "HS256";
const issuer = "network-mikro";

export interface SessionPayload extends JWTPayload {
  uid: string;
  role: Role;
  email: string;
  name: string;
}

export async function signSession(
  payload: Omit<SessionPayload, "iat" | "exp" | "iss">,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expires = now + env.AUTH_SESSION_DAYS * 24 * 60 * 60;

  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg })
    .setIssuer(issuer)
    .setIssuedAt(now)
    .setExpirationTime(expires)
    .sign(secret);
}

export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, secret, {
      algorithms: [alg],
      issuer,
    });
    return payload;
  } catch {
    return null;
  }
}
