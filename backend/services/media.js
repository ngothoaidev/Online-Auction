import crypto from "node:crypto";
import { and, eq, lt, sql } from "drizzle-orm";
import db from "../db/index.js";
import { mediaAssets } from "../db/schema.js";
import { AppError } from "../utils/errors.js";
import { localMedia } from "../adapters/media/local.js";

// Only the local private adapter exists. Real deployments need an object-store adapter with private ACLs and
// short-lived signed reads behind this same {put,get,remove} interface.
const adapter = localMedia;

export const MAX_BYTES = Number(process.env.MEDIA_MAX_BYTES || 5 * 1024 * 1024);
export const PURPOSES = ["payment", "shipping", "message"];
const MAX_PENDING_PER_OWNER_PURPOSE = 5;
export const PENDING_TTL_MS = Number(process.env.MEDIA_PENDING_TTL_MS || 60 * 60 * 1000);

/** Content sniffing: only JPEG, PNG and WebP, decided by magic bytes, never by the client-declared type or file name. */
export function detectImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

export const previewPath = (orderId, assetId) => `/order/${orderId}/proofs/${assetId}`;

export async function storeOrderUpload({ orderId, ownerId, purpose, buffer }) {
  if (!PURPOSES.includes(purpose)) throw new AppError(400, "VALIDATION_ERROR", "purpose must be payment, shipping or message");
  if (!buffer || buffer.length === 0) throw new AppError(400, "VALIDATION_ERROR", "A file is required");
  if (buffer.length > MAX_BYTES) throw new AppError(413, "FILE_TOO_LARGE", `File exceeds ${Math.round(MAX_BYTES / 1024 / 1024)} MiB`);
  const mime = detectImageType(buffer);
  if (!mime) throw new AppError(415, "UNSUPPORTED_MEDIA", "Only JPEG, PNG or WebP images are accepted");

  const [{ n }] = await db.select({ n: sql`count(*)::int` }).from(mediaAssets)
    .where(and(eq(mediaAssets.orderId, orderId), eq(mediaAssets.ownerId, ownerId), eq(mediaAssets.purpose, purpose), eq(mediaAssets.state, "pending")));
  if (n >= MAX_PENDING_PER_OWNER_PURPOSE) throw new AppError(429, "UPLOAD_LIMIT", "Too many unused uploads; use or wait for the pending ones to expire");

  const id = crypto.randomUUID();
  await adapter.put(id, buffer);
  try {
    await db.insert(mediaAssets).values({ id, ownerId, orderId, purpose, storageKey: id, mime, size: buffer.length, state: "pending" });
  } catch (error) {
    await adapter.remove(id); // never leave an unmanaged file behind
    throw error;
  }
  return { assetId: id, previewPath: previewPath(orderId, id), mime, size: buffer.length };
}

export async function readOrderAsset(orderId, assetId) {
  const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.orderId, orderId)));
  if (!asset) throw new AppError(404, "NOT_FOUND", "File not found");
  return { asset, data: await adapter.get(asset.storageKey) };
}

/** Inside the caller's transaction: claim a pending asset for this order/owner/purpose and mark it attached. */
export async function attachAsset(tx, { assetId, orderId, ownerId, purpose }) {
  const [asset] = await tx.select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).for("update");
  if (!asset || asset.orderId !== orderId || asset.ownerId !== ownerId || asset.purpose !== purpose || asset.state !== "pending") {
    throw new AppError(400, "INVALID_ASSET", "The uploaded file cannot be used for this action");
  }
  await tx.update(mediaAssets).set({ state: "attached", attachedAt: new Date() }).where(eq(mediaAssets.id, assetId));
  return previewPath(orderId, assetId);
}

/** Worker job: drop uploads that were never attached (abandoned forms, failed requests). Attached files are never auto-deleted. */
export async function cleanupPending({ olderThanMs = PENDING_TTL_MS } = {}) {
  const cutoff = new Date(Date.now() - olderThanMs);
  const stale = await db.select().from(mediaAssets).where(and(eq(mediaAssets.state, "pending"), lt(mediaAssets.createdAt, cutoff)));
  for (const a of stale) {
    await adapter.remove(a.storageKey);
    await db.delete(mediaAssets).where(and(eq(mediaAssets.id, a.id), eq(mediaAssets.state, "pending")));
  }
  return { removed: stale.length };
}
