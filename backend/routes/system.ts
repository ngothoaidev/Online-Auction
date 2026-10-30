import { Router } from "express";
import systemController from "../controllers/system.ts"
const route = Router();

// GET: Live System Stats
route.get('/live-stats', systemController.getLiveStats);

export default route;