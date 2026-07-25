import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_VERIFICATION_DOCUMENT_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function assertVerificationDocumentDataUrl(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("data:image/")) {
    throw new Error("A valid verification document image is required.");
  }

  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Verification document must be a base64 image.");
  }

  const [, mimeType, base64] = match;
  const extension = MIME_EXTENSIONS[mimeType];
  if (!extension) {
    throw new Error("Verification document must be JPG, PNG, or WebP.");
  }

  const buffer = Buffer.from(base64, "base64");
  if (buffer.length > MAX_VERIFICATION_DOCUMENT_BYTES) {
    throw new Error("Verification document must be under 5MB.");
  }

  return { buffer, extension };
}

export async function storeVerificationDocumentDataUrl(userId: string, dataUrl: string) {
  const { buffer, extension } = assertVerificationDocumentDataUrl(dataUrl);
  const digest = crypto.createHash("sha256").update(`${userId}:${Date.now()}`).update(buffer).digest("hex").slice(0, 32);
  const uploadDir = path.join(process.cwd(), "private_uploads", "verification");
  const fileName = `${digest}.${extension}`;

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer, { flag: "wx" });

  return `/api/verification/document/${fileName}`;
}
