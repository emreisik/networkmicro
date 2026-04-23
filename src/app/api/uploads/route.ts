import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/require";
import {
  buildObjectKey,
  publicUrlFor,
  uploadObject,
  validateImageFile,
  UploadValidationError,
} from "@/lib/storage";

/**
 * Generic authenticated upload endpoint.
 *
 * POST multipart/form-data with fields:
 *   namespace: "submissions" | "campaigns" | "avatars"
 *   file: File
 *
 * Returns { url, key, mime, size }.
 *
 * Server actions handle the typical upload flows (submission proof, campaign assets);
 * this endpoint exists for future client-side editors or bulk imports.
 */
export async function POST(req: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const form = await req.formData();
  const namespaceRaw = String(form.get("namespace") ?? "");
  const file = form.get("file");

  if (
    namespaceRaw !== "submissions" &&
    namespaceRaw !== "campaigns" &&
    namespaceRaw !== "avatars"
  ) {
    return NextResponse.json({ error: "Invalid namespace" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  // Role check for asset namespaces
  if (
    namespaceRaw === "campaigns" &&
    !["ADMIN", "SUPER_ADMIN"].includes(user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    validateImageFile({ size: file.size, mime: file.type });
  } catch (e) {
    if (e instanceof UploadValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  const key = buildObjectKey(namespaceRaw, user.id, file.type, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadObject({ key, body: buffer, contentType: file.type });

  return NextResponse.json({
    url: publicUrlFor(key),
    key,
    mime: file.type,
    size: file.size,
  });
}
