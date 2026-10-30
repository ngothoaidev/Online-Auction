// Dev/test fallback for public listing photos when Cloudinary is not configured: validated images are written under
// PUBLIC_MEDIA_DIR and served read-only from /media/public. Same limits as the order uploads (5 MiB, JPEG/PNG/WebP by content).
import type { Request, Response, NextFunction } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import multer from "multer";
import express from "express";
import { AppError } from "../utils/errors.ts";
import { MAX_BYTES, detectImageType } from "../services/media.ts";

export const publicMediaDir = () => process.env.PUBLIC_MEDIA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), "../storage/public");
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export const cloudinaryConfigured = () => Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

export function localImages(field: string, max: number) {
  const parse = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: max, fields: 20, parts: max + 20 } }).array(field, max);
  return (req: Request, res: Response, next: NextFunction) => parse(req, res, async (err) => {
    try {
      if (err) throw new AppError(err.code === "LIMIT_FILE_SIZE" ? 413 : 400, err.code === "LIMIT_FILE_SIZE" ? "FILE_TOO_LARGE" : "VALIDATION_ERROR", err.code === "LIMIT_FILE_SIZE" ? "A photo is too large" : "Invalid upload");
      const base = process.env.PUBLIC_API_URL || `${req.protocol}://${req.get("host")}`;
      await fs.mkdir(publicMediaDir(), { recursive: true });
      const saved: { path: string; mimetype: string; size: number }[] = [];
      for (const f of (req.files as Express.Multer.File[] | undefined) ?? []) {
        const mime = detectImageType(f.buffer);
        if (!mime) throw new AppError(415, "UNSUPPORTED_MEDIA", "Only JPEG, PNG or WebP images are accepted");
        const name = `${crypto.randomUUID()}.${EXT[mime]}`;
        await fs.writeFile(path.join(publicMediaDir(), name), f.buffer, { flag: "wx" });
        saved.push({ path: `${base}/media/public/${name}`, mimetype: mime, size: f.size });
      }
      req.files = saved as unknown as Express.Multer.File[]; // same shape the controller already expects ({ path })
      next();
    } catch (error) {
      next(error);
    }
  });
}

export const servePublicMedia = () => (req: Request, res: Response, next: NextFunction) =>
  express.static(publicMediaDir(), { index: false, fallthrough: false, dotfiles: "deny", setHeaders: (r) => { r.setHeader("X-Content-Type-Options", "nosniff"); r.setHeader("Cache-Control", "public, max-age=3600"); } })(req, res, next);
