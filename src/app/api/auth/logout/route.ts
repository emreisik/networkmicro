import { NextResponse } from "next/server";
import { clearSessionCookie, readSession } from "@/lib/auth/session";
import { writeAudit } from "@/services/audit";
import { AuditAction } from "@prisma/client";

export async function POST() {
  const session = await readSession();
  if (session) {
    await writeAudit({
      actorId: session.uid,
      action: AuditAction.USER_LOGOUT,
      entityType: "User",
      entityId: session.uid,
    });
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
