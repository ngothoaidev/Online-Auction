import { Router } from "express";
import { validate } from "../validation/index.ts";
import { searchQuery } from "../validation/search.ts";

import searchController from "../controllers/search.ts"

const route = Router();

// GET: Search Auctions
route.get('/', validate({ query: searchQuery }), searchController.searchAuctions);

export default route;