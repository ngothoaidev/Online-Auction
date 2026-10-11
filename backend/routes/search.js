import { Router } from "express";
import { validate } from "../validation/index.js";
import { searchQuery } from "../validation/search.js";

import searchController from "../controllers/search.js"

const route = new Router();

// GET: Search Auctions
route.get('/', validate({ query: searchQuery }), searchController.searchAuctions);

export default route;