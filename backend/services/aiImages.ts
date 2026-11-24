import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { detectImageType } from '../utils/imageType.ts';
import { AppError } from '../utils/errors.ts';

export const aiTempDir = () => path.join(os.tmpdir(), 'aurum-ai-drafts');
export async function prepareImages(files: Express.Multer.File[]) {
  if (files.length < 1 || files.length > 3 || files.reduce((n, f) => n + f.size, 0) > 15 * 1024 * 1024) throw new AppError(400, 'VALIDATION_ERROR', 'Choose 1 to 3 photos, up to 5 MiB each.');
  const output: Buffer[] = [];
  for (const file of files) {
    try {
      const bytes = await fs.readFile(file.path);
      if (!detectImageType(bytes)) throw new Error('type');
      const image = sharp(bytes, { limitInputPixels: 16000000, animated: true, failOn: 'warning' });
      const metadata = await image.metadata();
      if ((metadata.pages || 1) !== 1 || !['jpeg', 'png', 'webp'].includes(metadata.format || '')) throw new Error('format');
      output.push(await image.rotate().resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 80 }).toBuffer());
    } catch { throw new AppError(415, 'UNSUPPORTED_MEDIA', 'Use a valid static JPEG, PNG or WebP image of at most 16 megapixels.'); }
  }
  return output;
}
export async function removeUploads(files: Express.Multer.File[]) { await Promise.all(files.map(f => fs.unlink(f.path).catch(() => {}))); }
export async function cleanupAiTemp() {
  const names = await fs.readdir(aiTempDir()).catch(() => [] as string[]);
  for (const name of names) {
    if (!/^draft-[a-f0-9-]+$/.test(name)) continue;
    const file = path.join(aiTempDir(), name);
    const stat = await fs.stat(file).catch(() => null);
    if (stat?.isFile() && stat.mtimeMs < Date.now() - 3600000) await fs.unlink(file).catch(() => {});
  }
}
