import { Router } from "express";
import authController from "../controllers/auth.js"
const route = new Router();

// GET: List Auction
route.post('/register', authController.createUser);
route.post('/login', authController.getUser);
export default route;