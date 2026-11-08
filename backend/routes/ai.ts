import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { z } from 'zod';
import { requireAuth, requireSeller, requireVerified } from '../middleware/auth.ts';
import { authLimiter } from '../middleware/rateLimit.ts';
import { aiTempDir, removeUploads } from '../services/aiImages.ts';
import { capabilities, generateDraft, readDraft, recordEvent } from '../services/listingAssistant.ts';
import { requireAvailable } from '../services/aiConfig.ts';
import { draftInput } from '../validation/ai.ts';
import { keyFrom } from '../services/idempotency.ts';
import { AppError } from '../utils/errors.ts';

const route = Router();
route.use(requireAuth, requireSeller, requireVerified);
route.get('/listing-capabilities', async (req, res, next) => {
  try { res.set('Cache-Control', 'no-store').json(await capabilities(req.user!.id)); } catch (e) { next(e); }
});
route.get('/listing-draft/:requestId', async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.requestId);
    const result = await readDraft(req.user!.id, id);
    res.set('Cache-Control', 'no-store').status(result.status).json(result.body);
  } catch (e) { next(e instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Invalid request ID.') : e); }
});
const upload = multer({ storage: multer.diskStorage({
  destination: (_req, _file, cb) => { fs.mkdir(aiTempDir(), { recursive: true, mode: 0o700 }).then(() => cb(null, aiTempDir()), error => cb(error, '')); },
  filename: (_req, _file, cb) => cb(null, `draft-${crypto.randomUUID()}`),
}), limits: { files: 3, fileSize: 5 * 1024 * 1024, fields: 2, fieldSize: 8000, parts: 6 } }).array('images', 3);
route.post('/listing-draft', authLimiter(process.env.NODE_ENV === 'test' ? Number(process.env.AI_TEST_RATE_LIMIT || 10) : 10, 60000), (req, res, next) => {
  try { requireAvailable(req.user!.id); if (!keyFrom(req)) throw new AppError(400, 'VALIDATION_ERROR', 'Idempotency-Key is required.'); }
  catch (e) { next(e); return; }
  upload(req, res, async err => {
    const files = (req.files as Express.Multer.File[] | undefined) || [];
    try {
      if (err) throw new AppError(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400, 'VALIDATION_ERROR', 'Use 1–3 photos, each at most 5 MiB.');
      const input = draftInput.safeParse(req.body);
      if (!input.success || files.length < 1) throw new AppError(400, 'VALIDATION_ERROR', 'Provide 1–3 photos, notes up to 2000 characters, and en or vi locale.');
      const result = await generateDraft(req.user!.id, keyFrom(req)!, input.data, files);
      res.set('Cache-Control', 'no-store').status(result.status).json(result.body);
    } catch (e) { next(e); }
    finally { await removeUploads(files); }
  });
});
route.post('/listing-draft/:requestId/events', authLimiter(60, 60000), async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.requestId);
    const body = z.object({ event: z.enum(['applied', 'undone', 'published']), auctionId: z.number().int().positive().optional() }).strict().parse(req.body);
    await recordEvent(req.user!.id, id, body.event, body.auctionId);
    res.sendStatus(204);
  } catch (e) { next(e instanceof z.ZodError ? new AppError(400, 'VALIDATION_ERROR', 'Invalid event.') : e); }
});
export default route;
