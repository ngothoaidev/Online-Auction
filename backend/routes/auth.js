import { Router } from "express";
import authController from "../controllers/auth.js"
const route = new Router();

// POST: register
route.post('/register', authController.createUser);

// POST: login
route.post('/login', authController.getUser);

// GET: get current user
route.get('/me', authController.getCurrentUser);
export default route;