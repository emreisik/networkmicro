import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import { randomId } from "@/lib/utils";

export const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
export const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export type StorageNamespace = "submissions" | "campaigns" | "avatars";

function clientConfig(): S3ClientConfig {
  const cfg: S3ClientConfig = {
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  };
  if (env.S3_ENDPOINT) cfg.endpoint = env.S3_ENDPOINT;
  return cfg;
}

let _client: S3Client | null = null;
function client(): S3Client {
  if (!_client) _client = new S3Client(clientConfig());
  return _client;
}

function extensionFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function buildObjectKey(
  namespace: StorageNamespace,
  ownerId: string,
  mime: string,
  originalName?: string,
): string {
  const ext = extensionFromMime(mime);
  const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const uid = randomId(16);
  const base = originalName
    ? sanitizeFilename(originalName.replace(/\.[^.]+$/, ""))
    : "file";
  return `${namespace}/${stamp}/${ownerId}/${uid}-${base}.${ext}`;
}

export function publicUrlFor(key: string): string {
  if (env.S3_PUBLIC_URL)
    return `${env.S3_PUBLIC_URL.replace(/\/+$/, "")}/${key}`;
  return `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
}

export interface UploadInput {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}

export async function uploadObject(input: UploadInput): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: input.cacheControl ?? "public, max-age=31536000, immutable",
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await client().send(
    new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
  );
}

export async function signedReadUrl(
  key: string,
  expiresIn = 60 * 5,
): Promise<string> {
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    { expiresIn },
  );
}

export interface ValidateFileInput {
  size: number;
  mime: string;
}

export class UploadValidationError extends Error {
  code: "SIZE_EXCEEDED" | "MIME_NOT_ALLOWED";
  constructor(code: UploadValidationError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export function validateImageFile(file: ValidateFileInput): void {
  if (!ALLOWED_IMAGE_MIME.has(file.mime)) {
    throw new UploadValidationError(
      "MIME_NOT_ALLOWED",
      `Unsupported file type: ${file.mime}`,
    );
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new UploadValidationError(
      "SIZE_EXCEEDED",
      `File too large. Max ${(MAX_UPLOAD_SIZE_BYTES / 1024 / 1024).toFixed(0)} MB`,
    );
  }
}
